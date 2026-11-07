// ===== Parcours des Dofus : les Dofus rangés par famille, du haut (ce qu'il faut d'abord) vers le bas (ce qu'il débloque).
// La structure vient de l'analyse des prérequis (les quêtes d'un Dofus incluses dans celles d'un autre) ; elle est écrite ici
// car DofusDB ne la donne pas. Les Dofus sont désignés par leur nom : un Dofus absent des données est simplement ignoré, et tout Dofus
// qui n'est dans aucune famille (nouveau Dofus, ou sans prérequis) arrive dans « Indépendants », rangé par niveau puis par effort.
const PRIM = ['Dofus Ocre', 'Dofus Émeraude', 'Dofus Pourpre', 'Dofus Turquoise', 'Dofus Ébène', 'Dofus Ivoire'];
const PARCOURS = {
  groups: [
    // Argenté et la série primordiale partent des deux mêmes quêtes (« Ça sent le gaz », « Balade en forêt »)
    { n: 'Début commun', top: { q: 1962 }, lanes: [
      { n: 'Argenté', tree: { d: 'Dofus Argenté', kids: [{ d: 'Dofus Argenté Scintillant', req: 'prim' }] } },
      { n: 'Série primordiale', tree: { ach: 1036, kids: PRIM.map(n => ({ d: n })) } }] },
    { n: 'Série Pandala', lanes: [{ tree: { d: 'Domakuro', kids: [{ d: 'Dorigami', kids: [{ d: 'Dofus Tacheté' }, { d: 'Dofus du Cauchemar' },
      { d: 'Dofus Verdoyant', kids: [{ d: 'Dofus Sylvestre', req: 'prim' }] }] }] } }] },
    { n: 'Dimensions Divines', lanes: [{ tree: { d: 'Dofus des Veilleurs', kids: [{ d: 'Dofus Nébuleux' }] } }] },
  ],
  alone: 'Indépendants',
};
const pDofus = name => SDZL.find(d => d.n === name);
const pPlaced = new Set();
(function collect(nodes) { for (const n of nodes) { if (n.d) pPlaced.add(n.d); collect(n.kids || []); } })(
  PARCOURS.groups.flatMap(g => g.lanes.map(l => l.tree)));
const pDone = n => n.d ? (pDofus(n.d) ? sdzOwned(pDofus(n.d)) : true) : n.ach ? achDone(n.ach) : qDoneS(n.q);
const pOrder = name => { const i = SDZ_ORDER.indexOf(pDofus(name)); return i < 0 ? 999 : i; };
const pLeft = d => { const a = collectPrereqs('d', d.id); return a.q.size; };

// Un nœud est affiché s'il l'est lui-même (mêmes cases que les autres listes) ou si l'un de ses descendants l'est : l'arbre garde son fil
// Le nœud lui-même s'affiche selon les mêmes cases que les autres listes (obtenus, etc.)
function pSelf(n) {
  if (n.d) { const d = pDofus(n.d); return !!d && sdzVisible(d) && rwShown(d); }
  return n.ach ? !!SACH[n.ach] && (sShowDone || !achDone(n.ach)) : !!SC.quetes[n.q] && (sShowDone || !qDoneS(n.q));
}
const pVisible = n => pSelf(n) || (n.kids || []).some(pVisible);
const pPivotHtml = n => {
  if (n.ach) { const a = SACH[n.ach], [d, t] = achProg(a), dn = achDone(a.id);
    return `<div class="pv${dn ? ' own' : ''}" data-sgo="${a.id}" tabindex="0" role="button" title="Voir le succès « ${esc(a.n)} »"><img src="${achImg(a)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span><b>${esc(a.n)}</b><small>Succès · ${d} / ${t}</small></span></div>`; }
  const q = SC.quetes[n.q], dn = qDoneS(n.q);
  return `<div class="pv${dn ? ' own' : ''}" data-goq="${n.q}" tabindex="0" role="button" title="Voir la quête « ${esc(qName(n.q))} »">${qIcon(q, n.q)}<span><b>${esc(qName(n.q))}</b><small>Quête · début commun</small></span></div>`;
};
let pNext = null;   // le premier Dofus pas encore obtenu de chaque famille dont tout ce qui précède l'est
function pFindNext(n, parentOk, found) {
  if (found.v) return;
  if (n.d && pDofus(n.d) && parentOk && !pDone(n) && pVisible(n)) { pNext.add(n.d); found.v = true; return; }
  for (const k of (n.kids || []).slice().sort((a, b) => pOrder(a.d || '') - pOrder(b.d || ''))) pFindNext(k, parentOk && pDone(n), found);
}
function pNodeHtml(n) {
  if (!pVisible(n)) return '';
  const kids = (n.kids || []).slice().sort((a, b) => pOrder(a.d || '') - pOrder(b.d || '')).map(pNodeHtml).filter(Boolean);
  if (!pSelf(n)) return kids.join('');   // un nœud masqué (obtenu) laisse ses descendants à sa place : le fil de l'arbre continue sans lui
  let head;
  if (n.d) {
    const d = pDofus(n.d), left = !sdzOwned(d) ? pLeft(d) : 0;
    const req = n.req === 'prim' ? PRIM.map(pDofus).filter(Boolean) : null;
    head = `<div class="pn${pNext.has(n.d) ? ' next' : ''}">${dofusCard(d)}${left ? `<div class="pt-m">${plural(left, 'quête')} à faire</div>` : ''}${req ? `<div class="pt-m pt-req">+ les ${req.length} primordiaux <b>${req.filter(sdzOwned).length} / ${req.length}</b></div>` : ''}</div>`;
  } else head = `<div class="pn">${pPivotHtml(n)}</div>`;
  return `<div class="pt">${head}${kids.length ? `<div class="pt-k">${kids.map(k => `<div class="pt-c">${k}</div>`).join('')}</div>` : ''}</div>`;
}
function parcoursHtml() {
  pNext = new Set(); for (const g of PARCOURS.groups) for (const l of g.lanes) pFindNext(l.tree, true, { v: false });
  const groups = PARCOURS.groups.map(g => {
    const lanes = g.lanes.map(l => ({ n: l.n, html: pNodeHtml(l.tree) })).filter(l => l.html);
    if (!lanes.length) return '';
    return `<section class="pg"><h3>${esc(g.n)}</h3>${g.top ? `<div class="pt-top">${pPivotHtml(g.top)}</div>` : ''}<div class="pg-lanes">${lanes.map(l => `<div class="pl">${l.n ? `<h4>${esc(l.n)}</h4>` : ''}${l.html}</div>`).join('')}</div></section>`;
  }).join('');
  const alone = SDZ_ORDER.filter(d => !pPlaced.has(d.n) && sdzVisible(d) && rwShown(d))
    .sort((a, b) => { const k = d => (SDZLV[d.id] || [999, 999])[1]; return k(a) - k(b) || pLeft(a) - pLeft(b); });
  return `<div class="parcours">${groups}${alone.length ? `<section class="pg pg-alone"><h3>${esc(PARCOURS.alone)}</h3><div class="pt-alone">${alone.map(d => `<div class="pn">${dofusCard(d)}${sdzOwned(d) ? '' : pLeft(d) ? `<div class="pt-m">${plural(pLeft(d), 'quête')} à faire</div>` : ''}</div>`).join('')}</div></section>` : ''}</div>`;
}
