// ===== Événements : clics et changements sur les listes, la fiche et la bande des Dofus ; options d'affichage.
function onScClick(e){
  const ad = e.target.closest('[data-adone]');
  if (ad && sPick && sPick.k === 'a') { setAchDone(sPick.id, !achDone(sPick.id)); return; }
  const qd = e.target.closest('[data-qdone]');
  if (qd && sPick && sPick.k === 'q') { setQuestDone(sPick.id, !qDoneS(sPick.id)); return; }
  const qs = e.target.closest('[data-qst]');
  if (qs && sPick && sPick.k === 'q') {   // Commencée / Bloquée : un second clic retire l'état
    const id = sPick.id, v = qs.dataset.qst;
    if (qState[id] === v) delete qState[id]; else qState[id] = v;
    renderSucces(); return;
  }
  if (e.target.closest('input,label')) return;
  if (e.target.closest('[data-closedet]')) { dismissSheet(); return; }
  const gv = e.target.closest('[data-goalview]');
  if (gv) { sMode = 'quetes'; mTab = 'quetes'; store.set('sMode', sMode); sCat = QGOAL; store.set('sCat', sCat); sPick = null; sSearch = ''; document.getElementById('scSearch').value = ''; renderSucces(); document.getElementById('viewSucces').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const pf = e.target.closest('[data-progf]');
  if (pf) { sProg = sProg === pf.dataset.progf ? null : pf.dataset.progf; renderScList(); return; }
  const inf = e.target.closest('[data-dzinfo]');
  if (inf) { const d = SDZ[+inf.dataset.dzinfo]; uiAlert(`${d.n} : ${dzWho(d)}`); return; }
  const own = e.target.closest('[data-sdzown]');
  if (own) {   // ✓ obtenu (avec cascade) / ↺ non obtenu
    const d = SDZ[+own.dataset.sdzown];
    if (sdzOwned(d)) { uncheck('d', d.id); return; }
    const acc = collectPrereqs('d', d.id);
    if (acc.a.size + acc.q.size + acc.o.size + acc.d.size) openDlg('d', d.id); else { setSdzOwned(d, true); saveSc(); }
    return;
  }
  const rk = e.target.closest('[data-rkind]');
  if (rk) { rKind = rk.dataset.rkind; store.set('rKind', rKind); rCat = SALL; store.set('rCat', rCat); sPick = null; sSearch = ''; document.getElementById('scSearch').value = ''; renderSucces(); return; }
  const rg = e.target.closest('[data-rgoal]');
  if (rg) { const [k, id] = rg.dataset.rgoal.split(':'), r = rwOf(k, +id); if (r) { rwSetGoal(r, !rwIsGoal(r)); renderSucces(); } return; }
  const all = e.target.closest('[data-sall]');
  if (all) { const id = +all.dataset.sall, list = catIds(id).flatMap(c => SBYCAT[c] || []).filter(sVisible);
    askConfirm(`Marquer les ${list.length} succès de « ${SCAT[id].n} » comme obtenus, avec leurs quêtes ?`, 'Tout cocher').then(ok => { if (!ok) return;
      withUndo(`${list.length} succès cochés`, () => { for (const a of list) { sdone.add(a.id); for (const oid of a.ob) { const o = SC.objectifs[oid]; if (o && o.t === 'q') sq.add(o.r); } } });
      saveSc(); });
    return; }
  const qall = e.target.closest('[data-sqall]');
  if (qall) { const id = +qall.dataset.sqall, ids = (QBYCAT[id] || []).filter(qVisible), nom = id === QOTHER ? 'Autres quêtes' : SCAT[id].n;
    askConfirm(`Marquer les ${ids.length} quêtes de « ${nom} » comme faites ?`, 'Tout cocher').then(ok => { if (ok) { withUndo(`${ids.length} quêtes cochées`, () => ids.forEach(q => sq.add(q))); saveSc(); } });
    return; }
  const qnone = e.target.closest('[data-sqnone]');
  if (qnone) { const id = +qnone.dataset.sqnone, ids = (QBYCAT[id] || []).filter(qVisible), nom = id === QOTHER ? 'Autres quêtes' : SCAT[id].n;
    askConfirm(`Décocher les ${ids.length} quêtes de « ${nom} » ? Les succès marqués obtenus qui les demandent sont aussi décochés.`, 'Tout décocher').then(ok => { if (!ok) return;
      withUndo(`${ids.length} quêtes décochées`, () => ids.forEach(q => { sq.delete(q); (QOWN[q] || []).forEach(a => sdone.delete(a)); })); saveSc(); });
    return; }
  const none = e.target.closest('[data-snone]');
  if (none) { const id = +none.dataset.snone, list = catIds(id).flatMap(c => SBYCAT[c] || []).filter(sVisible);
    askConfirm(`Décocher les ${list.length} succès de « ${SCAT[id].n} », avec leurs quêtes et objectifs ?`, 'Tout décocher').then(ok => { if (!ok) return;
      withUndo(`${list.length} succès décochés`, () => { for (const a of list) { sdone.delete(a.id); for (const oid of a.ob) { const o = SC.objectifs[oid]; if (!o) continue; if (o.t === 'q') sq.delete(o.r); else if (o.t === 'x') sodone.delete(+oid); } } });
      saveSc(); });
    return; }
  const pk = e.target.closest('[data-pick]');
  if (pk) {
    const [k, id] = pk.dataset.pick.split(':'); sPick = { k, id: +id };
    const fromDetail = !!pk.closest('#scDetail');
    renderScList(); renderDetail();
    if (fromDetail) { const r = document.getElementById((k === 'a' ? 'ach' : 'q') + id); if (r) r.scrollIntoView({ block: 'nearest' }); }
    else if (isMobile()) openSheet();
    routeSync();
  }
}
document.getElementById('scList').addEventListener('click', onScClick);
document.getElementById('scList').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.row[data-pick]')) { e.preventDefault(); e.target.click(); } });
document.getElementById('scDetail').addEventListener('click', onScClick);
// Succès : même principe que les quêtes
function setAchDone(id, on){
  if (on) {
    // le succès n'est marqué qu'à la validation : ses propres quêtes apparaissent ainsi comme « à valider », pas « déjà faites »
    const acc = collectPrereqs('a', id);
    if (acc.a.size + acc.q.size + acc.o.size + acc.d.size) { openDlg('a', id); return; }   // aperçu de la cascade
    confirmCheck(`Marquer le succès « ${SACH[id].n} » comme obtenu ?`, () => sdone.add(id)); return;
  }
  uncheck('a', id);
}
// Cocher : confirmation (avec la cascade des prérequis s'il y en a) ; décocher : confirmation si d'autres éléments en dépendent
function setQuestDone(id, on){
  if (on) {
    const acc = collectPrereqs('q', id);
    if (acc.a.size + acc.q.size + acc.o.size + acc.d.size) { openDlg('q', id); return; }   // ses prérequis
    confirmCheck(`Marquer la quête « ${qName(id)} » comme faite ?`, () => sq.add(id)); return;
  }
  uncheck('q', id);
}
function onScChange(e){
  const t = e.target;
  if (t.dataset.sdzgoal) { const id = +t.dataset.sdzgoal; t.checked ? sdzGoals.add(id) : sdzGoals.delete(id); renderSucces(); return; }
  if (t.dataset.sach) {
    setAchDone(+t.dataset.sach, t.checked);
  }
  else if (t.dataset.sq) {
    setQuestDone(+t.dataset.sq, t.checked);
  }
  else if (t.dataset.so) { const id = +t.dataset.so; if (t.checked) { sodone.add(id); saveSc(); } else uncheck('o', id); }
}
document.getElementById('scList').addEventListener('change', onScChange);
document.getElementById('scDetail').addEventListener('change', onScChange);
let scSearchT;
document.getElementById('scSearch').addEventListener('input', e => { clearTimeout(scSearchT); scSearchT = setTimeout(() => { sSearch = e.target.value; renderScList(); if (sMode === 'donjons') renderScTree(); }, 200); });
document.getElementById('scLevel').addEventListener('change', e => { P.state.level = Math.max(1, Math.min(200, +e.target.value || 200)); renderSucces(); });
document.getElementById('scShowDone').onchange = e => { sShowDone = e.target.checked; store.set('sShowDone', sShowDone); renderSucces(); };
document.getElementById('scShowLocked').onchange = e => { sShowLocked = e.target.checked; store.set('sShowLocked', sShowLocked); renderSucces(); };
document.getElementById('scSeasonal').onchange = e => { sSeasonal = e.target.checked; store.set('sSeasonal', sSeasonal); renderSucces(); };
document.querySelectorAll('[data-smode]').forEach(b => b.onclick = () => { if (sMode !== b.dataset.smode) sPick = null; sMode = b.dataset.smode; store.set('sMode', sMode); renderSucces(); });


