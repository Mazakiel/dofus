// ===== Cascade : fenêtre d'aperçu de ce qui sera validé ou décoché, décochage en cascade, confirmation simple avant une coche.
// ---- Boîte de dialogue : aperçu en arbre de ce qui sera validé en cascade ----
let DLG = null;   // { k:'a'|'q', id, a:Set, q:Set, o:Set, open:Set('a12'|'q34') }
const dlgEl = document.getElementById('scDialog');
function openDlg(k, id, st){   // st : 's' / 'b' quand la quête est seulement commencée / bloquée (ses prérequis sont proposés, pas elle)
  const acc = collectPrereqs(k, id);
  DLG = { k, id, st, a: new Set(acc.a), q: new Set(acc.q), o: new Set(acc.o), d: new Set(acc.d), open: new Set() };
  renderDlg();
  if (typeof dlgEl.showModal === 'function') dlgEl.showModal(); else dlgEl.setAttribute('open', '');
}
function closeDlg(){ DLG = null; if (dlgEl.open) dlgEl.close(); }

// ---- Décocher en cascade : tout ce qui dépend de l'élément décoché ----
// Dépendances inverses : quête → quêtes qui l'exigent (QNEXT), succès qui la contiennent (QOWN), Dofus qu'elle donne ;
// succès → succès parents, quêtes qui l'exigent (OA), Dofus qu'il donne ou dont il est prérequis ; Dofus → quêtes qui l'exigent (PO).
const applyRemoval = rm => P.applyRemoval(rm);
// Décocher : directement si rien d'autre n'en dépend, sinon confirmation avec la liste de ce qui sera décoché
function uncheck(kind, id){
  const rm = collectDependents(kind, id);
  rm[kind].add(id);   // l'élément lui-même (même s'il n'était validé qu'indirectement)
  const n = rm.a.size + rm.q.size + rm.o.size + rm.d.size;
  if (n <= 1) { applyRemoval(rm); saveSc(); return; }
  DLG = { mode: 'rm', k: kind, id, rm, open: new Set() };
  renderDlg();
  if (typeof dlgEl.showModal === 'function') dlgEl.showModal(); else dlgEl.setAttribute('open', '');
}
function renderRmDlg(){
  const { k, id, rm } = DLG;
  const nom = k === 'a' ? SACH[id].n : k === 'q' ? qName(id) : k === 'd' ? SDZ[id].n : ((SC.objectifs[id] || {}).n || 'Objectif');
  const img = k === 'a' ? achImg(SACH[id]) : k === 'd' ? itemImg(SDZ[id]) : '';
  const im = document.getElementById('scDlgImg'); im.src = img; im.style.display = img ? '' : 'none';
  document.getElementById('scDlgTitle').textContent = 'Décocher : ' + nom;
  document.getElementById('scDlgSub').textContent = 'Tout ce qui en dépend sera aussi décoché.';
  const other = (set, kk) => [...set].filter(x => !(kk === k && x === id));
  const A = other(rm.a, 'a').map(x => SACH[x]).filter(Boolean), Q = other(rm.q, 'q'), O = other(rm.o, 'o'), D = other(rm.d, 'd').map(x => SDZ[x]).filter(Boolean);
  const parts = [D.length && `<b>${D.length}</b> Dofus`, A.length && `<b>${A.length}</b> succès`,
    Q.length && `<b>${Q.length}</b> quête${Q.length > 1 ? 's' : ''}`, O.length && `<b>${O.length}</b> objectif${O.length > 1 ? 's' : ''}`].filter(Boolean);
  document.getElementById('scDlgSum').innerHTML = parts.length ? 'Sera aussi décoché : ' + parts.join(', ') + '.' : '';
  const sec = (titre, items) => items.length ? `<div class="sub" style="margin-top:8px">${titre}</div><ul>${items.join('')}</ul>` : '';
  document.getElementById('scDlgBody').innerHTML =
    (D.length ? `<div class="sub" style="margin-top:8px">Dofus</div><div>${rewChips(D)}</div>` : '')
    + sec('Succès', A.map(a => `<li><div class="dl-row"><span class="dl-lbl dl-ach"><img src="${achImg(a)}" alt="" loading="lazy" referrerpolicy="no-referrer">${esc(a.n)}</span> <span class="muted" style="font-size:.78rem">${esc(catPath(a.c))}</span></div></li>`))
    + sec('Quêtes', Q.map(q => `<li><div class="dl-row"><span class="dl-lbl">${esc(qName(q))}</span> <span class="muted" style="font-size:.78rem">${SC.quetes[q] && SC.quetes[q].lv ? 'niv. ' + SC.quetes[q].lv : ''}</span></div></li>`))
    + sec('Objectifs', O.map(o => `<li><div class="dl-row"><span class="dl-lbl">${esc((SC.objectifs[o] || {}).n || 'Objectif')}</span></div></li>`));
  document.getElementById('scDlgBody').querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true }));
  const b = document.getElementById('scDlgApply'); b.textContent = 'Décocher'; b.classList.add('danger');
}

// aperçu en lecture seule : tout ce qui est listé sera validé (le référentiel fait foi)
function dlBox(kind, id, isDone){
  return isDone ? '<input type="checkbox" checked disabled title="Déjà validé">' : '<input type="checkbox" checked disabled title="Sera validé">';
}
const pendTxt = acc => [acc.d && acc.d.size && acc.d.size + ' Dofus', acc.a.size && acc.a.size + ' succès', acc.q.size && acc.q.size + ' quête' + (acc.q.size > 1 ? 's' : ''), acc.o.size && acc.o.size + ' obj.'].filter(Boolean).join(', ');
function dlAchRow(aid, seen, label){
  const s = SACH[aid]; if (!s) return '';
  const dn = sdone.has(aid) || achDone(aid);
  if (seen.has('a' + aid)) return `<li><div class="dl-row ${dn ? 'done' : ''}"><span class="dl-tog empty"></span><span class="dl-lbl muted">↳ ${esc(s.n)} (déjà listé plus haut)</span></div></li>`;
  const acc = collectPrereqs('a', aid), pend = pendTxt(acc), open = DLG.open.has('a' + aid);
  const has = s.ob.some(x => SC.objectifs[x]);
  return `<li><div class="dl-row ${dn ? 'done' : DLG.a.has(aid) ? '' : 'off'}">
      <button class="dl-tog ${has ? '' : 'empty'}" data-dltog="a${aid}" aria-label="Déplier">${open ? '▾' : '▸'}</button>
      ${dlBox('a', aid, dn)}${label ? `<span class="dl-kind">${label}</span>` : ''}<span class="dl-lbl dl-ach"><img src="${achImg(s)}" alt="" loading="lazy" referrerpolicy="no-referrer">${esc(s.n)}</span>
      ${DZ_REW_A[aid] ? rewChips(DZ_REW_A[aid]) : ""}<span class="muted" style="font-size:.78rem">${pend ? `${pend} dedans` : ''}</span></div>
    ${open && has ? `<ul>${dlAchKids(aid, new Set([...seen, 'a' + aid]))}</ul>` : ''}</li>`;
}
function dlQuestRow(qid, seen, label){
  const q = SC.quetes[qid] || {}, dn = qDoneS(qid);
  if (seen.has('q' + qid)) return `<li><div class="dl-row ${dn ? 'done' : ''}"><span class="dl-tog empty"></span><span class="dl-kind">${label || 'quête'}</span><span class="dl-lbl muted">${esc(qName(qid))} (déjà listée plus haut)</span></div></li>`;
  const has = (q.pre || []).length + (q.preA || []).length + (q.preD || []).length > 0, open = DLG.open.has('q' + qid);
  const pend = has ? pendTxt(collectPrereqs('q', qid)) : '';
  return `<li><div class="dl-row ${dn ? 'done' : DLG.q.has(qid) ? '' : 'off'}">
      <button class="dl-tog ${has ? '' : 'empty'}" data-dltog="q${qid}" aria-label="Voir les prérequis">${open ? '▾' : '▸'}</button>
      ${dlBox('q', qid, dn)}<span class="dl-kind">${label || 'quête'}</span><span class="dl-lbl">${esc(qName(qid))}</span>${DZ_REW_Q[qid] ? " " + rewChips(DZ_REW_Q[qid]) : ""}
      <span class="muted" style="font-size:.78rem">${q.lv ? `niv. ${q.lv}` : ''}${pend ? ` · prérequis : ${pend}` : ''}</span></div>
    ${open && has ? `<ul>${dlQuestKids(qid, new Set([...seen, 'q' + qid]))}</ul>` : ''}</li>`;
}
function dlDofusRow(did, seen){
  const d = SDZ[did]; if (!d) return "";
  const dn = sdzOwned(d);
  if (seen.has("d" + did)) return `<li><div class="dl-row ${dn ? "done" : ""}"><span class="dl-tog empty"></span><span class="dl-kind">Dofus requis</span><span class="dl-lbl muted">${esc(d.n)} (déjà listé plus haut)</span></div></li>`;
  const has = !!(d.a || d.q || d.pa), open = DLG.open.has("d" + did), ns = new Set([...seen, "d" + did]);
  return `<li><div class="dl-row ${dn ? "done" : DLG.d.has(did) ? "" : "off"}">
      <button class="dl-tog ${has ? "" : "empty"}" data-dltog="d${did}" aria-label="Déplier">${open ? "▾" : "▸"}</button>
      ${dlBox("d", did, dn)}<span class="dl-kind">Dofus requis</span><span class="dl-lbl dl-ach"><img src="${itemImg(d)}" alt="" loading="lazy" referrerpolicy="no-referrer">${esc(d.n)}</span>
      <span class="muted" style="font-size:.78rem">${d.pa ? "prérequis puis dialogue" : d.a || d.q ? "" : "par dialogue"}</span></div>
    ${open && has ? `<ul>${(d.a ? dlAchRow(d.a, ns, "donné par") : "") + (d.q ? dlQuestRow(d.q, ns, "donné par") : "") + (d.pa || []).map(a => dlAchRow(a, ns, "prérequis")).join("")}</ul>` : ""}</li>`;
}
function dlQuestKids(qid, seen){
  const q = SC.quetes[qid] || {};
  return (q.preD || []).map(d => dlDofusRow(d, seen)).join("") + (q.pre || []).map(p => dlQuestRow(p, seen, 'prérequis')).join('') + (q.preA || []).map(a => dlAchRow(a, seen, 'succès requis')).join('');
}
function dlAchKids(aid, seen){
  const a = SACH[aid];
  return a.ob.map(oid => [oid, SC.objectifs[oid]]).filter(x => x[1]).map(([oid, o]) => {
    if (o.t === 'a') return dlAchRow(o.r, seen, 'succès');
    if (o.t === 'q') return dlQuestRow(o.r, seen, 'quête');
    if (o.t === 'lvl') return `<li><div class="dl-row ${P.state.level >= o.r ? 'done' : 'off'}"><span class="dl-tog empty"></span><input type="checkbox" ${P.state.level >= o.r ? 'checked' : ''} disabled><span class="dl-kind">niveau</span><span class="dl-lbl">${esc(o.n)}</span></div></li>`;
    const dn = sodone.has(+oid);
    return `<li><div class="dl-row ${dn ? 'done' : DLG.o.has(+oid) ? '' : 'off'}"><span class="dl-tog empty"></span>${dlBox('o', +oid, dn)}<span class="dl-kind">objectif</span><span class="dl-lbl">${esc((o.n || '').trim() || a.d || a.n)}</span></div></li>`;
  }).join('');
}
// Succès qui seraient complétés « par la même occasion » si on valide la sélection
function alsoCompleted(){
  const before = new Set(SC.succes.filter(a => achDone(a.id)).map(a => a.id));
  return P.simulate(() => {   // on applique la sélection, on regarde ce qui devient complet, puis l'état d'origine revient
    DLG.a.forEach(x => sdone.add(x)); DLG.q.forEach(x => sq.add(x)); DLG.o.forEach(x => sodone.add(x)); if (DLG.k === 'a') sdone.add(DLG.id); else if (DLG.k === 'q' && !DLG.st) sq.add(DLG.id);
    return SC.succes.filter(a => !before.has(a.id) && sVisible(a) && achDone(a.id) && a.id !== DLG.id);
  });
}
function renderDlg(){
  if (!DLG) return;
  document.querySelector('#scDialog .dl-tools').hidden = DLG.mode === 'rm';
  if (DLG.mode === 'rm') { renderRmDlg(); return; }
  const isA = DLG.k === 'a', isD = DLG.k === 'd', r = isA ? SACH[DLG.id] : null, dz = isD ? SDZ[DLG.id] : null, q = isA || isD ? null : (SC.quetes[DLG.id] || {});
  document.getElementById('scDlgImg').src = isA ? achImg(r) : isD ? itemImg(dz) : '';
  document.getElementById('scDlgImg').style.display = isA || isD ? '' : 'none';
  document.getElementById('scDlgTitle').textContent = isA ? r.n : isD ? dz.n : qName(DLG.id);
  document.getElementById('scDlgSub').textContent = isA ? `${catPath(r.c)} — tu viens de le marquer obtenu. Tout ce qu’il contient et exige sera validé.`
    : isD ? `Dofus ${dz.pa ? "qui nécessite" : dz.pre ? "lié à" : "donné par"} ${sdzSrc(dz)} — tu viens de le marquer obtenu. Tout ce qu’il exige sera validé.`
    : DLG.st ? `Quête${q.lv ? ' niv. ' + q.lv : ''} — tu viens de la marquer ${DLG.st === 's' ? 'commencée' : 'bloquée'}. Ses prérequis peuvent être validés ; elle reste ${DLG.st === 's' ? 'commencée' : 'bloquée'}.`
    : `Quête${q.lv ? ' niv. ' + q.lv : ''} — tu viens de la cocher. Ses prérequis seront validés.`;
  const tot = collectPrereqs(DLG.k, DLG.id);
  // « 53 quêtes », ou « 40 / 53 quêtes » si tu as retiré des éléments ; rien si zéro
  const part = (n, t, one, many) => !n ? '' : `<b>${n}</b>${n < t ? ` / ${t}` : ''} ${n > 1 ? many : one}`;
  const parts = [part(DLG.q.size, tot.q.size, 'quête', 'quêtes'), part(DLG.o.size, tot.o.size, 'autre objectif', 'autres objectifs')].filter(Boolean);
  // succès obtenus grâce à cette validation : ceux qu'on coche explicitement et ceux dont tous les objectifs deviennent faits
  const also = alsoCompleted();
  const alsoIds = new Set(also.map(a => a.id)); if (DLG.k === "a") alsoIds.add(DLG.id);
  const dzAlso = SDZL.filter(d => !sdzOwned(d) && (DLG.k !== "d" || d.id !== DLG.id) && (DLG.d.has(d.id) || (!d.pre && d.a && alsoIds.has(d.a)) || (!d.pre && d.q && DLG.q.has(d.q))));
  document.getElementById('scDlgSum').innerHTML =
    (parts.length ? `${isA ? 'Avec ce succès' : isD ? 'Avec ce Dofus' : DLG.st ? 'Pour cette quête' : 'Avec cette quête'}, tu valides aussi ${parts.join(' et ')}.` : `Rien d’autre n’est sélectionné : seul${isA ? ' ce succès' : isD ? ' ce Dofus' : 'e cette quête'} sera validé${isA || isD ? '' : 'e'}.`)
    + (dzAlso.length ? `<div style="margin-top:4px">Dofus obtenus en plus (${dzAlso.length}) : ${rewChips(dzAlso)}</div>` : '')
    + (also.length ? `<div style="margin-top:4px">Succès obtenus en plus (${also.length}) : ${also.slice(0, 10).map(a => `<b>${esc(a.n)}</b>`).join(', ')}${also.length > 10 ? ` et ${also.length - 10} autres` : ''}.</div>` : '');
  document.getElementById('scDlgApply').textContent = 'Valider';
  document.getElementById('scDlgApply').classList.remove('danger');
  document.getElementById('scDlgBody').innerHTML = `<ul>${isA ? dlAchKids(DLG.id, new Set(['a' + DLG.id]))
    : isD ? (dz.a ? dlAchRow(dz.a, new Set(), 'donné par') : '') + (dz.q ? dlQuestRow(dz.q, new Set(), 'donné par') : '') + (dz.pa || []).map(a => dlAchRow(a, new Set(), 'prérequis')).join('')
    : dlQuestKids(DLG.id, new Set(['q' + DLG.id]))}</ul>`;
  document.getElementById('scDlgBody').querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true }));
}
dlgEl.addEventListener('click', e => {
  if (!DLG) return;
  const tg = e.target.closest('[data-dltog]');
  if (tg) { const k = tg.dataset.dltog; DLG.open.has(k) ? DLG.open.delete(k) : DLG.open.add(k); renderDlg(); return; }
  const ex = e.target.closest('[data-dlexp]');
  if (ex) {   // déplier : seulement le premier niveau (les chaînes de quêtes peuvent être très longues)
    DLG.open = new Set();
    if (ex.dataset.dlexp === '1') {
      if (DLG.k === 'd') { const d = SDZ[DLG.id]; if (d.a) DLG.open.add('a' + d.a); if (d.q) DLG.open.add('q' + d.q); (d.pa || []).forEach(a => DLG.open.add('a' + a)); }
      else if (DLG.k === 'a') for (const oid of SACH[DLG.id].ob) { const o = SC.objectifs[oid]; if (o && (o.t === 'a' || o.t === 'q')) DLG.open.add(o.t + o.r); }
      else { const q = SC.quetes[DLG.id] || {}; (q.pre || []).forEach(p => DLG.open.add('q' + p)); (q.preA || []).forEach(a => DLG.open.add('a' + a)); }
    }
    renderDlg(); return;
  }
  const act = e.target.closest('[data-dlact]');
  if (act) {
    const k = act.dataset.dlact;
    if (k === 'apply' && DLG.mode === 'rm') { withUndo('Éléments décochés', () => applyRemoval(DLG.rm)); closeDlg(); closeSheet(); saveSc(); return; }
    const before = k === 'apply' ? P.snapshot() : null;
    if (k === 'apply') { DLG.a.forEach(id => sdone.add(id)); DLG.q.forEach(id => sq.add(id)); DLG.o.forEach(id => sodone.add(id)); DLG.d.forEach(id => setSdzOwned(SDZ[id], true)); }
    if (k === 'apply') {
      if (DLG.k === 'a') sdone.add(DLG.id);
      else if (DLG.k === 'q') { if (!DLG.st) sq.add(DLG.id); }   // commencée / bloquée : seuls ses prérequis sont validés
      else { const d = SDZ[DLG.id]; setSdzOwned(d, true); }   // Dofus : obtenu (calculé, ou forcé s'il manque des coches)
    }
    if (before && JSON.stringify(before) !== JSON.stringify(P.snapshot())) showUndo('Éléments cochés', before);
    closeDlg(); if (k === 'apply') closeSheet(); saveSc();   // « Annuler » : rien n'est modifié, la feuille reste ouverte
  }
});
// Échap = Annuler (la case cochée est décochée)
dlgEl.addEventListener('cancel', e => { e.preventDefault(); if (DLG) { closeDlg(); saveSc(); } });
// Pas de cascade : une simple confirmation évite les coches par accident. Dans tous les cas on redessine (la case est remise à son état réel).
function confirmCheck(msg, apply){
  askConfirm(msg, 'Valider').then(ok => { if (ok) { apply(); closeSheet(); } saveSc(); });
}
// Une quête passée en « Commencée » ou « Bloquée » : si ses prérequis ne sont pas faits, on propose de les valider comme pour une quête faite
function offerPrereqs(id, v){
  if (qState[id] !== v || qDoneS(id)) return;   // statut retiré, ou quête déjà faite
  const acc = collectPrereqs('q', id);
  if (acc.a.size + acc.q.size + acc.o.size + acc.d.size) openDlg('q', id, v);
}
function saveSc(){ for (const k of Object.keys(qState)) if (qDoneS(+k)) delete qState[k]; renderSucces(); }

