// ===== Listes : filtres d'avancement, vue Mes objectifs, vue Donjons, liste des quêtes et des succès.
// ---------- listes ----------
const head = (title, info, btns = '') => `<div class="sc-head"><h2>${title}</h2><span class="n">${info}</span><span class="sp"></span>${btns}</div>`;
const EMPTY = '<div class="empty">Rien à afficher : tout est fait, ou masqué par les filtres.</div>';
const LV_BANDS = [[1, 49], [50, 99], [100, 149], [150, 199], [200, 200]];
// Filtres d'avancement : mêmes puces et même règle dans toutes les listes de quêtes (catégories, objectifs Dofus, donjons)
function progBar(list){
  const cnt = c => list.filter(id => qStatus(id) === c).length;
  if (sProg && !cnt(sProg)) sProg = null;
  const chips = `<div class="chips" role="group" aria-label="Filtrer par avancement">${[['av', 'Disponible'], ['st', 'Commencé'], ['bl', 'Bloqué']].map(([c, l]) => `<button class="chip p-${c}" data-progf="${c}" aria-pressed="${sProg === c}">${l}<small>${cnt(c)}</small></button>`).join('')}</div>`;
  return { chips, keep: id => !sProg || qStatus(id) === sProg };
}
// Vue « Mes objectifs » : une section par récompense visée (Dofus, titre ou ornement), avec les quêtes qui restent (disponibles d'abord).
// Mêmes cases que les autres listes : les indisponibles ne s'affichent que si « Afficher les indisponibles » est coché.
const hiddenTxt = n => n ? ` · ${n} masquée${n > 1 ? 's' : ''}` : '';
function renderGoalQuests(){
  const lv = id => (SC.quetes[id] || {}).lv || 0;
  const per = GOALR.map(d => { const mine = Object.keys(GOALQ).map(Number).filter(q => GOALQ[q].includes(d)); return { d, mine, vis: mine.filter(qShown) }; });
  const bar = progBar([...new Set(per.flatMap(x => x.vis))]);
  let hiddenAll = 0, shownAll = 0;
  const secs = per.map(({ d, mine, vis }) => {
    const qs = vis.filter(bar.keep).sort((x, y) => (qAvailNow(y) - qAvailNow(x)) || lv(x) - lv(y));
    const todo = mine.filter(q => !qDoneS(q)), av = todo.filter(q => qStatus(q) === 'av').length, hidden = todo.filter(q => !qShown(q)).length;
    hiddenAll += hidden; shownAll += qs.length;
    return `<div class="sec dzsec">${rwIcon(d)}<span>${esc(d.n)}</span><span class="sp"></span>${todo.length ? `${todo.length} à faire · ${av} dispo.${hiddenTxt(hidden)}` : 'rien à faire : coche-le obtenu'}</div>${qs.map(q => questRow(q)).join('')}`;
  }).join('');
  const all = Object.keys(GOALQ).length, av = Object.keys(GOALQ).map(Number).filter(q => qStatus(q) === 'av').length;
  const hint = !shownAll && hiddenAll ? '<div class="empty">Les quêtes qui restent sont indisponibles. Coche « Afficher les indisponibles » pour les voir.</div>' : '';
  return head('Mes objectifs', `${goalSummary()} · ${plural(all, 'quête')} à faire, ${av} disponible${av > 1 ? 's' : ''}${hiddenTxt(hiddenAll)}`) + bar.chips + (secs || EMPTY) + hint;
}
function renderGoalAchs(){
  let hiddenAll = 0, shownAll = 0;
  const secs = GOALR.map(d => {
    const mine = Object.keys(GOALA).map(Number).filter(a => GOALA[a].includes(d)).map(a => SACH[a]).filter(Boolean);
    const as = mine.filter(aShown).sort((x, y) => x.lv - y.lv || x.o - y.o), hidden = mine.filter(a => !achDone(a.id) && !aShown(a)).length;
    hiddenAll += hidden; shownAll += as.length;
    return `<div class="sec dzsec">${rwIcon(d)}<span>${esc(d.n)}</span><span class="sp"></span>${mine.length ? `${plural(mine.length, 'succès', 'succès')}${hiddenTxt(hidden)}` : 'aucun succès à faire'}</div>${as.map(achCard).join('')}`;
  }).join('');
  const hint = !shownAll && hiddenAll ? '<div class="empty">Les succès qui restent sont indisponibles. Coche « Afficher les indisponibles » pour les voir.</div>' : '';
  return head('Mes objectifs', `${goalSummary()} · ${plural(Object.keys(GOALA).length, 'succès', 'succès')} à finir${hiddenTxt(hiddenAll)}`) + (secs || EMPTY) + hint;
}
function renderQuestList(el){
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const qn = norm(sSearch.trim());
  let ids, title, cid = null;
  if (qn) { ids = Object.keys(SC.quetes).map(Number).filter(id => qVisible(id) && norm(qName(id)).includes(qn)).slice(0, 120); title = `Recherche « ${esc(sSearch)} »`; }
  else if (sCat === QGOAL) { el.innerHTML = renderGoalQuests(); imgErr(el); return; }
  else if (sCat === QALL) { ids = qIdsOf(QALL); title = 'Toutes les quêtes'; }
  else if (sCat === QOTHER || (sCat && SCAT[sCat])) { cid = sCat; ids = (QBYCAT[sCat] || []).filter(qVisible); title = sCat === QOTHER ? 'Autres quêtes (prérequis)' : esc(catPath(sCat)); }
  else { el.innerHTML = '<div class="empty">Choisis une catégorie à gauche.</div>'; return; }
  const d = ids.filter(qDoneS).length, shownAll = ids.filter(qShown);
  const bar = progBar(shownAll), shown = shownAll.filter(bar.keep);
  const info = `${d} / ${ids.length} faites (${pctOf(d, ids.length)} %) · ${plural(shown.length, 'affichée')}${sCat === QALL && !qn ? ' · par niveau' : ''}`;
  const btns = cid != null ? `<button class="btn" data-sqall="${cid}">Tout cocher</button><button class="btn" data-sqnone="${cid}">Tout décocher</button>` : '';
  const lv = id => (SC.quetes[id] || {}).lv || 0;
  let html = '';
  if (sCat === QALL && !qn) {
    shown.sort((x, y) => lv(x) - lv(y) || qName(x).localeCompare(qName(y), 'fr'));
    for (const [lo, hi] of LV_BANDS) { const g = shown.filter(id => lv(id) >= lo && lv(id) <= hi) ; if (!g.length) continue;
      html += `<div class="sec">${lo === hi ? `Niveau ${lo}` : `Niveau ${lo} – ${hi}`}<span class="sp"></span>${g.length}</div>${g.map(id => questRow(id)).join('')}`; }
    const rest = shown.filter(id => lv(id) < 1); if (rest.length) html += `<div class="sec">Sans niveau<span class="sp"></span>${rest.length}</div>${rest.map(id => questRow(id)).join('')}`;
  } else {
    // regroupement par succès, dans l'ordre des objectifs
    const groups = new Map();
    for (const id of shown) { const owner = (QOWN[id] || []).map(a => SACH[a]).find(a => a && (cid == null || groupOf(a.c) === cid)) || null; const k = owner ? owner.id : 0; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(id); }
    const order = id => { const a = SACH[id]; return a ? a.o * 1e6 + a.id : 1e12; };
    html = [...groups.entries()].sort((x, y) => order(x[0]) - order(y[0])).map(([aid, qs]) => {
      const a = SACH[aid];
      const posIn = q => a ? a.ob.findIndex(oid => SC.objectifs[oid] && SC.objectifs[oid].r === q) : 0;
      qs.sort((x, y) => posIn(x) - posIn(y));
      const all = a ? a.ob.map(oid => SC.objectifs[oid]).filter(o => o && o.t === 'q') : [];
      return (a ? `<div class="sec"><img src="${achImg(a)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="sgo" data-pick="a:${a.id}">${esc(a.n)}</span>${achDone(a.id) ? ' <span class="dz-ok">✓</span>' : ''}<span class="sp"></span>${all.filter(o => qDoneS(o.r)).length} / ${all.length}</div>`
        : `<div class="sec">Sans succès<span class="sp"></span>${qs.length}</div>`) + qs.map(q => questRow(q, aid || null)).join('');
    }).join('');
  }
  el.innerHTML = head(title, info, btns) + bar.chips + (html || EMPTY);
  imgErr(el);
}
// « Tous les succès » : par tranche de niveau, puis dans l'ordre des catégories
function achByLevel(list){
  const co = a => (SCAT[a.c] || {}).o || 0;
  list = [...list].sort((x, y) => (x.lv || 0) - (y.lv || 0) || co(x) - co(y) || x.o - y.o);
  return LV_BANDS.map(([lo, hi]) => { const g = list.filter(a => (a.lv || 0) >= lo && (a.lv || 0) <= hi); if (!g.length) return '';
    return `<div class="sec">${lo === hi ? `Niveau ${lo}` : `Niveau ${lo} – ${hi}`}<span class="sp"></span>${g.length}</div>${g.map(achCard).join('')}`; }).join('');
}
// ---------- Donjons : les quêtes rangées par donjon, triés par niveau optimal ----------
const SDJ = SC.donjons || {};
const QDJ = {};   // donjon → quêtes qui le citent
for (const [qid, q] of Object.entries(SC.quetes)) for (const id of q.dj || []) (QDJ[id] = QDJ[id] || []).push(+qid);
const djOwn = id => (QDJ[id] || []).filter(qVisible);
const DJ_IDS = Object.keys(SDJ).map(Number).filter(id => (QDJ[id] || []).length)
  .sort((a, b) => SDJ[a].lv - SDJ[b].lv || SDJ[a].n.localeCompare(SDJ[b].n, 'fr'));
let sDj = store.get('sDj', null);
function djStats(id){ const own = djOwn(id); return { n: own.length, d: own.filter(qDoneS).length, goal: own.filter(q => GOALQ[q] && qShown(q)).length }; }
const djShown = id => id === sDj || djOwn(id).some(qShown);   // mêmes cases que les quêtes : obtenus, indisponibles, objectifs Dofus
function ensureDj(){
  if (sDj != null && DJ_IDS.includes(sDj) && djOwn(sDj).length) return;
  const ok = DJ_IDS.filter(id => djOwn(id).length);
  sDj = (ok.find(id => { const st = djStats(id); return st.d < st.n && SDJ[id].lv <= P.state.level; }) || ok.find(id => { const st = djStats(id); return st.d < st.n; }) || ok[0] || {}) ;
  if (typeof sDj !== 'number') sDj = null;
}
function renderDjTree(){
  const el = document.getElementById('scTree');
  const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), qn = norm(sSearch.trim());
  const rows = DJ_IDS.filter(id => djOwn(id).length && djShown(id) && (!qn || norm(SDJ[id].n + ' ' + SDJ[id].b.join(' ')).includes(qn)));
  const row = id => { const st = djStats(id), dj = SDJ[id], done = st.n && st.d === st.n;
    return `<div class="sc-cat dj${sDj === id ? ' sel' : ''}${done ? ' done' : ''}" data-sdj="${id}" title="${st.d} / ${st.n} quêtes faites"><span>${esc(dj.n)}</span><span class="rt">${st.goal ? `<span class="gdot" title="${st.goal} pour tes objectifs">◆ ${st.goal}</span>` : ''}<span class="pct">${done ? '✓' : `${st.d}/${st.n}`}</span><span class="lv">${dj.lv}</span></span><small>${esc(dj.b.join(', '))}</small></div>`; };
  let html = '';
  for (const [lo, hi] of LV_BANDS) { const g = rows.filter(id => SDJ[id].lv >= lo && SDJ[id].lv <= hi); if (!g.length) continue;
    html += `<div class="band"><span>${lo === hi ? `Niveau ${lo}` : `Niveau ${lo} – ${hi}`}</span><span>${g.length}</span></div>${g.map(row).join('')}`; }
  el.innerHTML = html || '<div class="empty">Aucun donjon à afficher : tout est fait, ou masqué par les filtres.</div>';
  const cur = SDJ[sDj], st = cur ? djStats(sDj) : null;
  document.getElementById('catBtn').innerHTML = cur ? `<span class="cb-n">${esc(cur.n)}</span><span class="pct">${st.d}/${st.n}</span><span aria-hidden="true">▾</span>` : 'Choisir un donjon';
}
// Vue d'ensemble d'un donjon, pour les quêtes affichées. fr : [ligne de « À faire », donjon, salle, genre]. Genres : d = faire le donjon (boss, butin, salle finale),
// a = action de salle, p = action à faire après le boss, x = hors du détail (rapporter à un PNJ, hors du donjon).
function djPlanHtml(djId, qids){
  const sl = (SDJ[djId] || {}).sl || [], rooms = sl.map(() => []), after = [], pure = [];
  const row = (qid, t, extra = '') => `<div class="ob go${qDoneS(qid) ? ' done' : ''}${sPick && sPick.k === 'q' && sPick.id === qid ? ' sel' : ''}" data-pick="q:${qid}" role="link" tabindex="0"><span class="x">•</span><span>${esc(t)} <span class="muted">· ${esc(qName(qid))}${extra}</span></span></div>`;
  for (const qid of qids) {
    const q = SC.quetes[qid] || {}, mine = (q.fr || []).filter(f => f[1] === djId && q.ft && q.ft[f[0]]);
    if (mine.some(f => f[3] === 'd') && !mine.some(f => f[3] === 'a' || f[3] === 'p')) pure.push(qid);   // la quête ne demande que de faire le donjon
    for (const [i, , r, k] of mine) {
      if (k === 'a' && rooms[r]) rooms[r].push({ qid, t: q.ft[i] });
      else if (k === 'p' && rooms[r]) after.push({ qid, t: q.ft[i], r });
    }
  }
  const head = (label, n, cls = '') => `<div class="dj-room${cls}"><span>${label}</span><span>${n}</span></div>`;
  const body = (pure.length ? head('Faire le donjon', pure.length) + pure.map(qid => `<div class="ob go${qDoneS(qid) ? ' done' : ''}${sPick && sPick.k === 'q' && sPick.id === qid ? ' sel' : ''}" data-pick="q:${qid}" role="link" tabindex="0"><span class="x">${flagIcon('dj')}</span><span>${esc(qName(qid))} <span class="muted">· boss, butin ou salle finale</span></span></div>`).join('') : '')
    + sl.map((label, r) => rooms[r].length ? head(esc(label), rooms[r].length) + rooms[r].map(x => row(x.qid, x.t)).join('') : '').join('')
    + (after.length ? head('⚠ Avant de sortir : après le boss', after.length, ' warn') + after.sort((a, b) => a.r - b.r).map(x => row(x.qid, x.t, ` · ${esc(sl[x.r])}`)).join('') : '');
  return body ? `<div class="dj-plan"><div class="lab">À faire dans le donjon</div>${body}</div>` : '';
}
function renderDjMain(el){
  const dj = SDJ[sDj];
  if (!dj) { el.innerHTML = '<div class="empty">Choisis un donjon à gauche.</div>'; return; }
  const st = djStats(sDj), lvl = q => (SC.quetes[q] || {}).lv || 0;
  const shownAll = djOwn(sDj).filter(qShown), bar = progBar(shownAll);
  const shown = shownAll.filter(bar.keep).sort((x, y) => lvl(x) - lvl(y) || qName(x).localeCompare(qName(y), 'fr'));
  el.innerHTML = head(esc(dj.n), `${st.d} / ${st.n} faites · ${plural(shown.length, 'affichée')}`)
    + `<div class="dj-meta"><span>Niveau optimal <b>${dj.lv}</b></span>${dj.b.length ? `<span>Boss <b>${esc(dj.b.join(', '))}</b></span>` : ''}${ddbLink('j', sDj)}${dplnLink(dj.dp)}</div>`
    + bar.chips + djPlanHtml(sDj, shown) + (shown.length ? `<div class="lab">Quêtes</div>` + shown.map(id => questRow(id)).join('') : EMPTY);
  imgErr(el);
}
function renderScList(){
  const el = document.getElementById('scList');
  if (sMode === 'donjons') { renderDjMain(el); return; }
  if (sMode === 'recomp') { renderRwMain(el); return; }
  if (sMode === 'quetes') { renderQuestList(el); return; }
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(sSearch.trim());
  let list, title, cid = null;
  if (q) {
    list = SC.succes.filter(a => sVisible(a) && (norm(a.n).includes(q) || norm(a.d).includes(q) || a.ob.some(oid => SC.objectifs[oid] && norm(SC.objectifs[oid].n).includes(q)))).slice(0, 80);
    title = `Recherche « ${esc(sSearch)} »`;
  } else if (sCat === QGOAL) { el.innerHTML = renderGoalAchs(); imgErr(el); return; }
  else if (sCat === SALL) { list = SC.succes.filter(sVisible); title = 'Tous les succès'; }
  else if (sCat && SCAT[sCat]) { cid = sCat; list = catIds(sCat).flatMap(id => SBYCAT[id] || []).filter(sVisible); title = esc(catPath(sCat)); }
  else { el.innerHTML = '<div class="empty">Choisis une catégorie à gauche.</div>'; return; }
  const shown = list.filter(aShown), d = list.filter(a => achDone(a.id)).length;
  const btns = cid ? `<button class="btn" data-sall="${cid}" title="Marquer tous les succès de cette catégorie comme obtenus, avec leurs quêtes">Tout cocher</button><button class="btn" data-snone="${cid}" title="Décocher tous les succès de cette catégorie, avec leurs quêtes et objectifs">Tout décocher</button>` : '';
  el.innerHTML = head(title, `${d} / ${list.length} obtenus (${pctOf(d, list.length)} %) · ${plural(shown.length, 'affiché')}`, btns) + (shown.length ? (sCat === SALL && !q ? achByLevel(shown) : shown.map(achCard).join('')) : EMPTY);
  imgErr(el);
}

