// ===== Menu de gauche et objectifs : catégories de quêtes, statistiques, arbre des catégories, objectifs Dofus (ce qui y mène).
// ---- Quêtes : rangées dans la catégorie du premier succès qui les demande ----
const QOTHER = -1;   // quêtes qui ne sont objectif d'aucun succès (seulement prérequis)
const QCAT = {};
for (const qid of Object.keys(SC.quetes)) {
  const owners = (QOWN_PRE[qid] || []).map(id => SACH[id]).filter(a => a && catAllowed(a.c));
  const best = owners[0];
  QCAT[qid] = best ? groupOf(best.c) : QOTHER;
}
const QBYCAT = {}; for (const [qid, c] of Object.entries(QCAT)) (QBYCAT[c] = QBYCAT[c] || []).push(+qid);
const qVisible = qid => sSeasonal || !(SC.quetes[qid] || {}).s;
const QALL = -2;     // entrée « Toutes les quêtes » (mode Quêtes), triée par niveau
const ALLQ = Object.keys(SC.quetes).map(Number);
const qIdsOf = cid => (cid === QALL ? ALLQ : (QBYCAT[cid] || [])).filter(qVisible);
function questStats(cid){
  const list = qIdsOf(cid);
  return { n: list.length, d: list.filter(qDoneS).length };
}
// ce que la liste affichera avec les cases « Afficher les obtenus / indisponibles »
const QSTAT_LBL = { done: 'Faite', av: 'Disponible', st: 'Commencée', bl: 'Bloquée', lock: 'Indisponible' };
const qCls = id => { const t = qStatus(id); return t === 'done' ? '' : t; };   // classe de la pastille : vert dispo, jaune commencée, rouge bloquée, vide indispo
const showOpts = () => ({ showDone: sShowDone, showLocked: sShowLocked });
const qShown = id => P.questShown(id, showOpts());   // une quête que tu as marquée reste visible
const aShown = a => P.achShown(a.id, showOpts());
const catHasShown = cid => cid === QGOAL || cid === SALL || (sMode === 'quetes' ? qIdsOf(cid).some(qShown) : catIds(cid).some(id => (SBYCAT[id] || []).some(a => sVisible(a) && aShown(a))));
// Menu de gauche : liste plate — sous-catégories de Quêtes, puis Événements, puis les quêtes sans succès
function scCatList(){
  const l = GOALD.length ? [{ id: QGOAL, n: 'Mes objectifs' }] : [];
  l.push(sMode === 'quetes' ? { id: QALL, n: 'Toutes les quêtes' } : { id: SALL, n: 'Tous les succès' });
  l.push(...(SC.menu || []).map(m => ({ id: m.id, n: m.n })));
  if (sMode === 'quetes') l.push({ id: QOTHER, n: 'Autres quêtes (prérequis)' });
  return l;
}
function renderScTree(){
  if (sMode === 'donjons') { renderDjTree(); return; }
  const el = document.getElementById('scTree');
  const pct = s => s.n ? Math.floor(100 * s.d / s.n) : 0;
  const stats = sMode === 'quetes' ? questStats : catStats;
  const cur = scCatList().find(c => c.id === sCat);
  document.getElementById('catBtn').innerHTML = cur ? `<span class="cb-n">${esc(cur.n)}</span>${cur.id === QGOAL ? '' : `<span class="pct">${pct(stats(cur.id))} %</span>`}<span aria-hidden="true">▾</span>` : 'Choisir une catégorie';
  const goalN = cid => cid === SALL ? SC.succes.filter(a => sVisible(a) && GOALA[a.id] && aShown(a)).length : sMode === 'quetes' ? qIdsOf(cid).filter(q => GOALQ[q] && qShown(q)).length : catIds(cid).flatMap(id => SBYCAT[id] || []).filter(a => sVisible(a) && GOALA[a.id] && aShown(a)).length;
  const goalCount = () => sMode === 'quetes' ? Object.keys(GOALQ).map(Number).filter(qShown).length : Object.keys(GOALA).map(id => SACH[id]).filter(a => a && aShown(a)).length;
  el.innerHTML = scCatList().map(c => [c, c.id === QGOAL ? { n: goalCount(), d: 0 } : stats(c.id)]).filter(([c, s]) => c.id === QGOAL || (s.n && (c.id === sCat || catHasShown(c.id)))).map(([c, s]) => {
    if (c.id === QGOAL) return `<div class="sc-cat${sCat === c.id ? ' sel' : ''}" data-scat="${c.id}" title="${s.n} affichés pour tes objectifs Dofus"><span>${esc(c.n)}</span><span class="rt"><span class="gdot">${s.n}</span></span></div>`;
    const g = GOALD.length ? goalN(c.id) : 0;
    return `<div class="sc-cat${sCat === c.id ? ' sel' : ''}${s.d === s.n ? ' full' : ''}" data-scat="${c.id}" title="${s.d} / ${s.n}${g ? ` · ${g} pour tes objectifs Dofus` : ''}"><span>${esc(c.n)}</span><span class="rt">${g ? `<span class="gdot" title="${g} pour tes objectifs Dofus">◆ ${g}</span>` : ''}<span class="pct">${pct(s)}%</span></span></div>`; }).join('');
}
// Dofus donnés proprement par un succès (récompense ou « obtenir le Dofus X ») ou par une quête (récompense d’étape)
const DZ_REW_A = {}, DZ_REW_Q = {};
for (const d of SDZL) { if (d.pre || d.pa) continue;
  if (d.a && /récompense de succès|description de succès/.test(d.src || "")) (DZ_REW_A[d.a] = DZ_REW_A[d.a] || []).push(d);
  if (d.q && d.src === "récompense de quête") (DZ_REW_Q[d.q] = DZ_REW_Q[d.q] || []).push(d); }
const rewChips = list => list.map(d => `<span class="rew" title="Récompense : ${esc(d.n)}"><img src="${itemImg(d)}" alt="" referrerpolicy="no-referrer">${esc(d.n)}</span>`).join(" ");
// ---- Sélection : la liste reste compacte, le détail s'affiche dans le panneau de droite ----
let sPick = null;   // { k:'a'|'q', id }
const isPick = (k, id) => !!sPick && sPick.k === k && sPick.id === id;
const imgErr = el => el.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true }));
const pctOf = (d, n) => n ? Math.floor(100 * d / n) : 0;
const plural = (n, s, p) => `${n} ${n > 1 ? (p || s + 's') : s}`;
const dzChip = (d, goal) => `<span class="rew${goal ? ' goalrew' : ''}"${goal ? ' title="Récompense, et ton objectif"' : ''}><img src="${itemImg(d)}" alt="" referrerpolicy="no-referrer">${esc(d.n)}</span>`;
const dzIcons = list => (list || []).map(d => `<img class="rew-ic" src="${itemImg(d)}" alt="" title="Récompense : ${esc(d.n)}" referrerpolicy="no-referrer">`).join('');

// ---------- objectifs Dofus : quêtes et succès qui y mènent ----------
const QGOAL = -3;   // entrée « Mes objectifs » du menu de gauche
const SALL = -4;    // entrée « Tous les succès » (mode Succès), par niveau
var GOALQ = {}, GOALA = {}, GOALD = [];
function computeGoals(){
  GOALD = SDZL.filter(d => sdzVisible(d) && sdzGoals.has(d.id) && !sdzOwned(d));
  const g = P.goalsFor(GOALD); GOALQ = g.q; GOALA = g.a;
}
const goalIcons = list => !list ? '' : `<span class="goalchips" title="Pour tes objectifs : ${esc(list.map(d => d.n).join(', '))}">${list.slice(0, 3).map(d => `<img src="${itemImg(d)}" alt="" referrerpolicy="no-referrer">`).join('')}${list.length > 3 ? `<b>+${list.length - 3}</b>` : ''}</span>`;
const goalBox = (list, rewards) => { const l = (list || []).filter(d => !(rewards || []).includes(d)); return l.length ? `<div class="goalbox"><b>Sert tes objectifs Dofus :</b><div>${l.map(d => dzChip(d)).join('')}</div></div>` : ''; };
const notGoal = (rewards, goals) => (rewards || []).filter(d => !(goals || []).includes(d));

