// ===== Fiche de détail et rendu : fiches de quête et de succès, rendu d'ensemble (renderSucces), aller à un succès.
// ---------- panneau de détail ----------
const okx = ok => `<span class="x ${ok ? 'ok' : 'ko'}">${ok ? '✓' : '✗'}</span>`;
const qLink = q => `<span class="sgo" data-pick="q:${q}">${esc(qName(q))}</span>`;
function achDetailHtml(a){
  const dn = achDone(a.id), [d, n] = achProg(a);
  const line = oid => {
    const o = SC.objectifs[oid]; if (!o) return '';
    const ok = objDone(oid);
    if (o.t === 'q') { const q = SC.quetes[o.r] || {};
      return `<div class="ob${ok ? ' done' : ''}"><input type="checkbox" class="gc round ${qCls(o.r)}" data-sq="${o.r}" ${ok ? 'checked' : ''} aria-label="Quête faite"><span>${qLink(o.r)}${q.grp ? ' <span class="badge bn">groupe</span>' : ''}</span><span class="lv">${q.lv ? 'Niv. ' + q.lv : ''}</span></div>`; }
    if (o.t === 'a') { const s = SACH[o.r]; const [sd, sn] = s ? achProg(s) : [0, 0];
      return `<div class="ob${ok ? ' done' : ''}"><input type="checkbox" class="gc" data-sach="${o.r}" ${ok ? 'checked' : ''} aria-label="Succès obtenu"><span>Succès <span class="sgo" data-pick="a:${o.r}">${esc(s ? s.n : o.n)}</span></span><span class="lv">${sn > 1 ? `${sd}/${sn}` : ''}</span></div>`; }
    if (o.t === 'lvl') return `<div class="ob${ok ? ' done' : ''}">${okx(ok)}<span>${esc(o.n)} <span class="muted">(d’après ton niveau)</span></span></div>`;
    return `<div class="ob${ok ? ' done' : ''}"><input type="checkbox" class="gc" data-so="${oid}" ${ok ? 'checked' : ''}><span>${esc((o.n || '').trim() || a.d || a.n)}</span></div>`;
  };
  const parents = (SPARENTS[a.id] || []).map(id => SACH[id]).filter(Boolean);
  return `<div class="hd"><img src="${achImg(a)}" alt="" referrerpolicy="no-referrer"><h3>${esc(a.n)}${copyBtn(a.n)}</h3><div class="k">Succès · niveau ${a.lv}${a.pts ? ` · <span class="pts">${a.pts}${iconImg(DBI('icon_cup.png'), IC.cup, 'cup', '')}</span>` : ''}</div></div>
    <div class="orn">${n ? `${d} / ${n}` : '✦'}</div>
    <div class="stat">${(() => { const st = dn ? 'done' : achAvailNow(a.id) ? 'av' : 'lock'; return `<span class="badge ${st}">${dn ? 'Obtenu' : st === 'av' ? 'Disponible' : 'Indisponible'}</span>`; })()}</div>
    <div class="acts prog"><button class="btn" data-adone aria-pressed="${dn}">Obtenu</button></div>
    <div class="quote${dn ? ' ok' : ''}">${esc(a.d)}</div>
    ${goalBox(GOALA[a.id], DZ_REW_A[a.id])}
    ${a.ob.length ? `<div class="lab">Objectifs</div>${a.ob.map(line).join('')}` : ''}
    ${dn ? '' : fluxSection(collectPrereqs('a', a.id).q, a.n, 'Quêtes restantes')}
    ${parents.length ? `<div class="lab">Fait partie de</div>${parents.map(p => `<div class="ob${achDone(p.id) ? ' done' : ''}">${okx(achDone(p.id))}<span><span class="sgo" data-pick="a:${p.id}">${esc(p.n)}</span></span></div>`).join('')}` : ''}
    ${DZ_REW_A[a.id] || a.ti || a.or ? `<div class="rwd"><div class="lab">Récompense</div>${(DZ_REW_A[a.id] || []).map(d => dzChip(d, (GOALA[a.id] || []).includes(d))).join('')}${achRewardChips(a)}</div>` : ''}
    <div class="path">${esc(catPath(a.c))}</div>
    <div class="ddb-row">${ddbLink('a', a.id)}</div>`;
}
function questDetailHtml(qid){
  const q = SC.quetes[qid] || {}, dn = qDoneS(qid), av = !dn && qAvailNow(qid), why = lockReasons(qid);
  const pre = [
    q.lv ? `<div class="ob">${okx(P.state.level >= q.lv)}<span>Niveau ${q.lv}</span></div>` : '',
    ...(q.pre || []).map(p => `<div class="ob">${okx(qDoneS(p))}<span>Quête ${qLink(p)}</span><span class="lv">${SC.quetes[p] && SC.quetes[p].lv ? 'Niv. ' + SC.quetes[p].lv : ''}</span></div>`),
    ...(q.preA || []).map(a => `<div class="ob">${okx(achDone(a))}<span>Succès ${SACH[a] ? `<span class="sgo" data-pick="a:${a}">${esc(SACH[a].n)}</span>` : a}</span></div>`),
    ...(q.preD || []).filter(d => SDZ[d]).map(d => `<div class="ob">${okx(sdzOwned(SDZ[d]))}<span>Posséder le ${esc(SDZ[d].n)}</span></div>`)].filter(Boolean);
  const owners = (QOWN[qid] || []).map(id => SACH[id]).filter(Boolean);
  const next = QNEXT[qid] || [];
  const DJN = SC.donjons || {};
  return `<div class="hd"><h3>${qIcon(q, qid)}${esc(qName(qid))}${copyBtn(qName(qid))}</h3><div class="k">${(QTYPE[q.ty || 0] || QTYPE[0])[2]}${q.lv ? ` · niveau ${q.lv}${q.lx ? ' à ' + q.lx : ''}` : ''}${q.ev ? ' · événement' : ''}</div><div class="tags" style="justify-content:center;margin-top:6px">${qTags(q).map(c => `<span class="tag ${c}">${TAGS[c]}</span>`).join('')}</div></div>
    <div class="orn">!</div>
    <div class="stat"><span class="badge ${qStatus(qid)}">${QSTAT_LBL[qStatus(qid)]}</span>${qStatus(qid) === 'lock' ? `<span class="muted">${esc(why.slice(0, 2).join(' · '))}${why.length > 2 ? ` (+${why.length - 2})` : ''}</span>` : ''}</div>
    <div class="acts prog">${dn ? '' : `<button class="btn" data-qst="s" aria-pressed="${qState[qid] === 's'}">Commencée</button><button class="btn" data-qst="b" aria-pressed="${qState[qid] === 'b'}">Bloquée</button>`}<button class="btn" data-qdone aria-pressed="${dn}">Faite</button></div>
    ${goalBox(GOALQ[qid], DZ_REW_Q[qid])}
    ${(q.dj || []).length ? `<div class="lab">${(q.dj || []).length > 1 ? 'Donjons' : 'Donjon'}</div>${q.dj.map(id => `<div class="ob"><span class="tag dj">DJ</span><span>${esc((DJN[id] || {}).n || 'Donjon ' + id)}${(DJN[id] || {}).lv ? ` <span class="muted">· niveau ${DJN[id].lv}</span>` : ''}</span></div>`).join('')}` : ''}
    ${(q.sp || []).length ? `<div class="lab">${q.sp.length > 1 ? 'Débuts possibles' : 'Début'}</div>${q.sp.map(p => `<div class="ob"><span class="x">•</span><span>${esc(p.n || 'PNJ')}${p.z ? ` <span class="muted">· ${esc(p.z)}</span>` : ''}</span><span class="lv">${coordBtn(p)}</span></div>`).join('')}` : ''}
    ${(q.ft || []).length ? `<div class="lab">À faire</div>${q.ft.map(l => `<div class="ob"><span class="x">•</span><span>${esc(l)}</span></div>`).join('')}` : ''}
    ${pre.length ? `<div class="lab">Prérequis</div>${pre.join('')}` : ''}
    ${owners.length ? `<div class="lab">Succès</div>${owners.map(a => `<div class="ob${achDone(a.id) ? ' done' : ''}">${okx(achDone(a.id))}<span><span class="sgo" data-pick="a:${a.id}">${esc(a.n)}</span></span></div>`).join('')}` : ''}
    ${next.length ? `<div class="lab">Débloque</div>${next.map(n => `<div class="ob${qDoneS(n) ? ' done' : ''}">${okx(qDoneS(n))}<span>${qLink(n)}</span><span class="lv">${SC.quetes[n] && SC.quetes[n].lv ? 'Niv. ' + SC.quetes[n].lv : ''}</span></div>`).join('')}` : ''}
    <div class="ddb-row">${ddbLink('q', qid)}</div>
    ${DZ_REW_Q[qid] || owners.some(a => a.ti || a.or) ? `<div class="rwd"><div class="lab">Récompense</div>${(DZ_REW_Q[qid] || []).map(d => dzChip(d, (GOALQ[qid] || []).includes(d))).join('')}${owners.map(a => achRewardChips(a, a.n)).join('')}</div>` : ''}`;
}
function renderDetail(){
  const el = document.getElementById('scDetail');
  const CLOSE = '<button class="det-close" data-closedet aria-label="Fermer">✕</button>';
  if (sPick && sPick.k === 'a' && SACH[sPick.id]) el.innerHTML = CLOSE + achDetailHtml(SACH[sPick.id]);
  else if (sPick && sPick.k === 'q' && SC.quetes[sPick.id]) el.innerHTML = CLOSE + questDetailHtml(sPick.id);
  else if (sPick && ['d', 't', 'o'].includes(sPick.k) && rwOf(sPick.k, sPick.id)) el.innerHTML = CLOSE + rwDetailHtml(rwOf(sPick.k, sPick.id));
  else el.innerHTML = '';
  imgErr(el);
  document.body.classList.toggle('has-pick', !!el.innerHTML);   // la fiche n'existe que quand quelque chose est choisi
}
function ensureCat(){
  const l = scCatList(); if (l.some(c => c.id === sCat)) return;
  const st = sMode === 'quetes' ? questStats : catStats, real = l.filter(c => ![QGOAL, QALL, SALL].includes(c.id));
  sCat = (real.find(c => { const x = st(c.id); return x.n && x.d < x.n; }) || real[0] || l[0]).id;   // première catégorie pas finie
}
function renderSucces(){
  if (!SC.succes.length) { document.getElementById('scList').innerHTML = '<div class="panel muted">Données des succès absentes.</div>'; return; }
  computeGoals();
  document.body.classList.remove('pc-wide');   // (remis par la vue Récompenses › Dofus quand elle s'affiche en parcours)
  const vis = SC.succes.filter(sVisible), dn = vis.filter(a => achDone(a.id));
  const qv = Object.keys(SC.quetes).map(Number).filter(qVisible), qd = qv.filter(qDoneS).length;
  // cadre doré : progression globale (quêtes et succès ensemble) ; le détail est dans les deux barres juste dessous
  document.getElementById('plN').textContent = `${pctOf(qd + dn.length, qv.length + vis.length)} %`;
  const pq = pctOf(qd, qv.length), pa = pctOf(dn.length, vis.length);
  document.getElementById('progQ').innerHTML = `<div class="l"><span>Quêtes</span><span><b>${qd}</b> / ${qv.length} · ${pq} %</span></div><div class="bar" role="progressbar" aria-label="Quêtes faites" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pq}"><i style="width:${pq}%"></i></div>`;
  document.getElementById('progA').innerHTML = `<div class="l"><span>Succès de quêtes</span><span><b>${dn.length}</b> / ${vis.length} · ${pa} %</span></div><div class="bar gold" role="progressbar" aria-label="Succès de quêtes obtenus" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pa}"><i style="width:${pa}%"></i></div>`;
  document.getElementById('scLevel').value = P.state.level;
  document.getElementById('scShowDone').checked = sShowDone;
  document.getElementById('scShowLocked').checked = sShowLocked;
  document.getElementById('scSeasonal').checked = sSeasonal;
  document.querySelectorAll('[data-smode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.smode === sMode)));
  document.getElementById('scSearch').placeholder = sMode === 'quetes' ? 'Rechercher une quête…' : sMode === 'donjons' ? 'Rechercher un donjon ou un boss…' : sMode === 'recomp' ? 'Rechercher une récompense…' : 'Rechercher un succès…';
  if (mTab !== 'plus') mTab = sMode;
  showTab();
  if (sMode === 'donjons') ensureDj(); else if (sMode === 'recomp') ensureRw(); else ensureCat();
  renderScTree(); renderScList(); renderDetail();
  if (typeof routeSync === 'function') routeSync();
}
document.getElementById('scTree').addEventListener('click', e => {
  const rc = e.target.closest('[data-rcat]');
  if (rc) {
    rCat = +rc.dataset.rcat; store.set('rCat', rCat); sPick = null; sSearch = ''; document.getElementById('scSearch').value = '';
    document.querySelector('.side').classList.remove('open'); document.getElementById('catBtn').setAttribute('aria-expanded', 'false');
    renderScTree(); renderScList(); renderDetail(); routeSync();
    if (isMobile()) window.scrollTo({ top: 0 });
    return;
  }
  const dj = e.target.closest('[data-sdj]');
  if (dj) {
    sDj = +dj.dataset.sdj; store.set('sDj', sDj); sPick = null;
    document.querySelector('.side').classList.remove('open'); document.getElementById('catBtn').setAttribute('aria-expanded', 'false');
    renderScTree(); renderScList(); renderDetail(); routeSync();
    if (isMobile()) window.scrollTo({ top: 0 });
    return;
  }
  const c = e.target.closest('[data-scat]'); if (!c) return;
  const id = +c.dataset.scat;
  sCat = id; store.set('sCat', id);
  sSearch = ''; document.getElementById('scSearch').value = '';
  document.querySelector('.side').classList.remove('open'); document.getElementById('catBtn').setAttribute('aria-expanded', 'false');
  renderScTree(); renderScList(); routeSync();
  if (isMobile()) window.scrollTo({ top: 0 });
});
