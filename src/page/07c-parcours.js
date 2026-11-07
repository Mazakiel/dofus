// ===== Parcours des Dofus : une grille lue de haut en bas, une colonne par famille, des flèches pour ce qui en demande un autre.
// La structure vient de l'analyse des prérequis DofusDB (quêtes, succès, Dofus à posséder) ; elle est écrite ici car DofusDB ne la donne pas.
// Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant : un nom absent des données est ignoré, et tout Dofus
// qui n'est pas placé arrive dans « Indépendants », rangé par niveau puis par effort restant. Dofawa est masqué (SDZ_HIDDEN).
const PRIM = ['Dofus Ocre', 'Dofus Émeraude', 'Dofus Pourpre', 'Dofus Turquoise', 'Dofus Ébène', 'Dofus Ivoire'];
// Disposition libre : chaque carte est placée à la hauteur de son niveau de fin (échelle PLV_PTS : serrée sous le niveau 100, plus large vers 200),
// dans sa colonne (PLANES) ; ce qui dépend d'un autre Dofus est toujours plus bas, et une carte ne chevauche jamais sa voisine. Pas de lignes communes :
// les colonnes ne s'alignent pas entre elles. Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant.
// lane = colonne, lv = niveau pour la hauteur, s = nombre de colonnes occupées.
const PLANES = { A: 0, M1: 1, M2: 2, P: 3, D: 4, I1: 5, I2: 6 };
const PW = 156, PSTEP = 172, PNH = 78, PGAP = 56, PSEP = 16;   // largeur d'une carte, pas des colonnes, hauteur estimée, écart entre un prérequis et ce qu'il ouvre, écart entre voisines
const PLV_PTS = [[0, 50], [50, 160], [100, 310], [150, 490], [200, 710]];   // [niveau, ordonnée du bas des cartes de ce niveau]
const PBANDS = [50, 100, 150, 200];   // traits discrets entre les paliers
const PN = [
  { id: 'arg', d: 'Dofus Argenté', lane: 'A', lv: 40 },
  { id: 'mais', ach: 1036, lane: 'M1', s: 2, lv: 40 },                    // « Mais où sont les Dofus ? » : les quêtes d'introduction des Dofus (niv. 30–40), tronc commun des six primordiaux
  { id: 'cawotte', d: 'Dofus Cawotte', lane: 'M2', lv: 60 },              // rattaché à l'introduction des Dofus (indication du joueur : DofusDB ne donne pas ce lien)
  { id: 'veill', d: 'Dofus des Veilleurs', lane: 'D', lv: 100 },          // Dimensions Divines : entre la série Pandala et les indépendants
  { id: 'neb', d: 'Dofus Nébuleux', lane: 'D', lv: 100 },
  { id: 'domakuro', d: 'Domakuro', lane: 'P', lv: 140 },
  { id: 'dorigami', d: 'Dorigami', lane: 'P', lv: 170 },
  { id: 'pin', d: 'Dom de Pin', lane: 'M2', lv: 200 },                    // s'achète à un PNJ une fois « Six sur six », « L'héritage de l'île brisée » et la quête « Entretemps, une renaissance » faits ; exigé par « Flovoraison » (Sylvestre)
  { id: 'tach', d: 'Dofus Tacheté', lane: 'P', lv: 200 },                // la chaîne de Cauchemar passe par « En ce jardin qui nous unit », sa dernière quête sur le chemin
  { id: 'cauch', d: 'Dofus du Cauchemar', lane: 'P', lv: 200 },          // la quête de Verdoyant exige « Un héritage tourmenté » (3 des 4 quêtes de Cauchemar)
  { id: 'verd', d: 'Dofus Verdoyant', lane: 'P', lv: 200 },              // la chaîne de Sylvestre passe par la quête de Verdoyant
  { id: 'six', ach: 1705, lane: 'M1', s: 2, lv: 200 },                   // « Six sur six » (6/6) : les six primordiaux et leurs quêtes finales ; ouvre Scintillant et Sylvestre
  { id: 'scint', d: 'Dofus Argenté Scintillant', lane: 'M1', lv: 200 },  // demande Argenté et presque tout « Six sur six » (il lui manque ses deux dernières quêtes)
  { id: 'sylv', d: 'Dofus Sylvestre', lane: 'P', lv: 200 },
];
// Les six primordiaux : deux colonnes, pas de lien entre eux (ils dépendent tous du tronc commun) ; cadre commun
const PBOX = { id: 'prim' };
// Flèches : ['de', 'vers']. Une flèche va toujours vers le bas (ce qui est dessous dépend de ce qui est dessus).
const PE = [['mais', 'cawotte'], ['mais', 'prim'], ['prim', 'six'], ['arg', 'scint'], ['six', 'scint'],
  ['domakuro', 'dorigami'], ['dorigami', 'tach'], ['tach', 'cauch'], ['cauch', 'verd'], ['verd', 'sylv'],
  ['six', 'pin'], ['pin', 'sylv'], ['veill', 'neb']];
const pDofus = name => SDZL.find(d => d.n === name);
const pNode = id => (id === 'prim' ? PBOX : PN.find(n => n.id === id));
const pPlaced = new Set(PN.filter(n => n.d).map(n => n.d).concat(PRIM));
const pLeft = d => collectPrereqs('d', d.id).q.size;
const pDoneNode = n => n.id === 'prim' ? PRIM.map(pDofus).filter(Boolean).every(sdzOwned)
  : n.d ? (pDofus(n.d) ? sdzOwned(pDofus(n.d)) : true) : n.ach ? achDone(n.ach) : qDoneS(n.q);
const pName = n => n.id === 'prim' ? 'les 6 primordiaux' : n.d ? n.d.replace(/^Dofus /, '') : n.ach ? (SACH[n.ach] || {}).n : qName(n.q);

// Carte compacte d'un Dofus : image, nom, niveau et effort, case objectif, obtenu. Un clic ouvre la fiche.
function pCard(d, id, pos, after, ready) {
  const own = sdzOwned(d), goal = !own && sdzGoals.has(d.id), left = own ? 0 : pLeft(d), lv = SDZLV[d.id];
  const lvTxt = lv ? (lv[0] === lv[1] ? `niv. ${lv[0]}` : `niv. ${lv[0]}–${lv[1]}`) : '', link = d.a || d.q || d.pa;
  const eff = left ? `${plural(left, 'quête')}` : (!own && !link ? 'à cocher' : '');
  return `<div class="cz${own ? ' own' : ''}${goal ? ' goal' : ''}${ready ? ' ready' : ''}${isPick('d', d.id) ? ' sel' : ''}" id="cz-${id}" style="${pos}" data-pick="d:${d.id}" tabindex="0" role="button" title="${esc(d.n)}">
    <img src="${itemImg(d)}" alt="" loading="lazy" referrerpolicy="no-referrer">
    <span class="cz-t"><b>${esc(d.n.replace(/^Dofus (?=\S)/, 'Dofus '))}</b><small>${esc(lvTxt)}</small>${eff ? `<small>${esc(eff)}</small>` : ''}${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span>
    <span class="cz-c">${own ? '' : `<button type="button" class="tgt${goal ? ' on' : ''}" data-rgoal="d:${d.id}" aria-pressed="${goal}" title="${goal ? 'Retirer des objectifs' : 'En faire un objectif'}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg></button>`}<button type="button" class="cz-ok" data-sdzown="${d.id}" title="${own ? 'Marquer comme non obtenu' : 'Marquer comme obtenu (avec la cascade de ses quêtes)'}">${own ? '↺' : '✓'}</button></span>
  </div>`;
}
// Carte d'un succès ou d'une quête qui sert de passage (tronc commun, départ commun, « Six sur six »)
function pPivot(n, pos, after, ready) {
  const dn = pDoneNode(n);
  if (dn && !sShowDone) return '';   // comme partout : un succès ou une quête faits ne s'affichent que si « Afficher les obtenus » est coché
  if (n.ach) { const a = SACH[n.ach]; if (!a) return ''; const [d, t] = achProg(a);
    return `<div class="cz pv${dn ? ' own' : ''}${ready ? ' ready' : ''}${n.ach && isPick('a', n.ach) ? ' sel' : ''}" id="cz-${n.id}" style="${pos}" data-pick="a:${a.id}" tabindex="0" role="button" title="${esc(a.n)}"><img src="${achImg(a)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="cz-t"><b>${esc(a.n)}</b><small>Succès · ${d} / ${t}</small>${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span></div>`; }
  if (!SC.quetes[n.q]) return '';
  return `<div class="cz pv${dn ? ' own' : ''}${ready ? ' ready' : ''}${isPick('q', n.q) ? ' sel' : ''}" id="cz-${n.id}" style="${pos}" data-pick="q:${n.q}" tabindex="0" role="button" title="${esc(qName(n.q))}">${qIcon(SC.quetes[n.q], n.q)}<span class="cz-t"><b>${esc(qName(n.q))}</b><small>Quête${dn ? '' : ''}</small>${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span></div>`;
}
// Ordonnée du bas des cartes d'un niveau (interpolée entre les points de PLV_PTS)
function pLevelY(lv) {
  const P = PLV_PTS; if (lv <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) if (lv <= P[i][0]) { const [l0, y0] = P[i - 1], [l1, y1] = P[i]; return y0 + (y1 - y0) * (lv - l0) / (l1 - l0); }
  return P[P.length - 1][1];
}
// Place les cartes : à la hauteur de leur niveau, sous leurs prérequis, sans chevaucher leurs voisines. nodes : { id, lane, span, lv, parents }
function pLayout(nodes) {
  const rect = {}, placed = [], todo = nodes.slice();
  while (todo.length) {
    const ready = todo.filter(n => n.parents.every(p => rect[p] || !nodes.some(m => m.id === p)));
    const n = (ready.length ? ready : todo).sort((a, b) => a.lv - b.lv)[0]; todo.splice(todo.indexOf(n), 1);
    const x = PLANES[n.lane] * PSTEP, w = (n.span || 1) * PW + ((n.span || 1) - 1) * (PSTEP - PW);
    let y = Math.max(pLevelY(n.lv) - PNH, ...n.parents.filter(p => rect[p]).map(p => rect[p].b + PGAP));
    for (let moved = true; moved;) { moved = false;
      for (const r of placed) if (x < r.l + r.w + PSEP && x + w > r.l - PSEP && y < r.b + PSEP && y + PNH > r.t - PSEP) { y = r.b + PSEP; moved = true; } }
    rect[n.id] = { l: x, t: y, w, h: PNH, b: y + PNH }; placed.push(rect[n.id]);
  }
  return rect;
}
const pStyle = (r, order) => `left:${Math.round(r.l)}px;top:${Math.round(r.t)}px;width:${r.w}px;order:${order}`;

function parcoursHtml() {
  const edgeIn = {}; for (const [a, b] of PE) (edgeIn[b] = edgeIn[b] || []).push(a);
  const ready = id => { const n = pNode(id); return !pDoneNode(n) && (edgeIn[id] || []).every(x => pDoneNode(pNode(x))); };
  const after = id => (edgeIn[id] || []).map(x => pName(pNode(x))).filter(Boolean);
  const hi = d => (SDZLV[d.id] || [200, 200])[1], lo = d => (SDZLV[d.id] || [200, 200])[0];
  const prim = PRIM.map(pDofus).filter(Boolean).sort((a, b) => SDZ_ORDER.indexOf(a) - SDZ_ORDER.indexOf(b));
  const alone = SDZ_ORDER.filter(d => !pPlaced.has(d.n) && sdzVisible(d) && rwShown(d))
    .sort((a, b) => hi(a) - hi(b) || lo(a) - lo(b) || pLeft(a) - pLeft(b));   // niveau de fin, puis de départ, puis effort
  // 1. ce qui s'affiche
  const nodes = [], info = {};
  for (const n of PN) {
    if (n.d) { const d = pDofus(n.d); if (!d || !sdzVisible(d) || !rwShown(d)) continue; info[n.id] = { n, d }; }
    else { if (pPivot(n, '', '', false) === '') continue; info[n.id] = { n }; }
    nodes.push({ id: n.id, lane: n.lane, span: n.s, lv: n.lv, parents: (edgeIn[n.id] || []).filter(x => x !== 'prim') });
  }
  const primShown = prim.filter(d => sdzVisible(d) && rwShown(d));
  primShown.forEach((d, i) => { const id = 'p' + prim.indexOf(d); info[id] = { d, prim: true };
    nodes.push({ id, lane: i % 2 ? 'M2' : 'M1', lv: hi(d), parents: ['mais'] }); });
  // « Six sur six » vient après les six primordiaux affichés
  const six = nodes.find(n => n.id === 'six'); if (six) six.parents = [...six.parents, ...primShown.map(d => 'p' + prim.indexOf(d))];
  alone.forEach((d, i) => { const id = 'a' + d.id; info[id] = { d, alone: true }; nodes.push({ id, lane: i % 2 ? 'I2' : 'I1', lv: hi(d), parents: [] }); });
  const rect = pLayout(nodes);
  // 2. cartes
  const out = [];
  for (const nd of nodes) {
    const f = info[nd.id], r = rect[nd.id], st = pStyle(r, Math.round(r.t) * 10 + PLANES[nd.lane]);
    const aft = !f.alone && !f.prim && after(nd.id).length ? 'après ' + after(nd.id).join(', ') : f.prim ? 'après ' + pName(pNode('mais')) : '';
    out.push(f.n && !f.n.d ? pPivot(f.n, st, aft, ready(nd.id)) : pCard(f.d, nd.id, st, aft, f.n && !f.alone ? ready(nd.id) : false));
  }
  if (primShown.length) {
    const rs = primShown.map(d => rect['p' + prim.indexOf(d)]), l = Math.min(...rs.map(r => r.l)) - 10, t = Math.min(...rs.map(r => r.t)) - 10, rr = Math.max(...rs.map(r => r.l + r.w)) + 10, b = Math.max(...rs.map(r => r.b)) + 10;
    out.unshift(`<div class="pbox" id="cz-prim" style="left:${l}px;top:${t}px;width:${rr - l}px;height:${b - t}px" aria-hidden="true"></div>`);
  }
  out.unshift(...PBANDS.map(lv => `<div class="pband" style="top:${Math.round(pLevelY(lv) + 8)}px"><span>niv. ${lv}</span></div>`));
  const W = Math.max(...Object.values(rect).map(r => r.l + r.w)) + 20, H = Math.max(...Object.values(rect).map(r => r.b)) + 30;
  return `<div class="pwrap"><div class="pgrid" id="pgrid" style="width:${W}px;height:${H}px"><svg class="pedges" id="pedges" aria-hidden="true"></svg>${out.join('')}</div></div>`;
}

// Flèches : tracées d'après la position réelle des cartes ; segments droits, coins arrondis
function pDrawEdges() {
  const g = document.getElementById('pgrid'), svg = document.getElementById('pedges'); if (!g || !svg) return;
  const R = id => { const e = document.getElementById('cz-' + id); if (!e) return null; const o = { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; o.r = o.l + o.w; o.b = o.t + o.h; o.cx = o.l + o.w / 2; return o; };
  const es = PE.map(([a, b]) => ({ a, b, A: R(a), B: R(b) })).filter(e => e.A && e.B);
  // Chaque flèche a son propre point de départ sous la carte source et son propre point d'arrivée sur la carte cible,
  // répartis sur la largeur dans l'ordre des cartes : les flèches ne se rejoignent jamais et ne se croisent pas.
  const spread = (list, key, other, side) => {
    const by = {}; for (const e of list) (by[e[key]] = by[e[key]] || []).push(e);
    for (const arr of Object.values(by)) { arr.sort((x, y) => x[other].cx - y[other].cx); const n = arr.length;
      arr.forEach((e, i) => { const c = e[key === 'a' ? 'A' : 'B']; e[side] = c.l + c.w * (i + 1) / (n + 1); e[side + 'Rank'] = i; }); }
  };
  spread(es, 'a', 'B', 'x1'); spread(es, 'b', 'A', 'x2');
  let h = '<defs><marker id="pah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0.5L10 5L0 9.5z" fill="currentColor"/></marker></defs>';
  for (const e of es) {
    const { A, B } = e;
    // Si les deux cartes se recouvrent à l'horizontale, la flèche descend tout droit : pas de petit décrochage qui se tord
    const lo = Math.max(A.l, B.l) + 12, hi = Math.min(A.r, B.r) - 12;
    if (lo <= hi) { const x = Math.min(Math.max(e.x2, lo), hi); e.x1 = e.x2 = x; }
    // droite si les cartes sont alignées ; sinon elle descend tout droit puis se courbe en S dans les 44 derniers pixels, juste au-dessus de la cible
    // (une courbe qui traverserait toute la hauteur croiserait des cartes)
    const yE = B.t - 3;
    let d;
    if (Math.abs(e.x1 - e.x2) < 3) d = `M${e.x1} ${A.b} L${e.x2} ${yE}`;
    else { const yb = Math.max(A.b + 10, yE - 44), k = (yE - yb) / 2; d = `M${e.x1} ${A.b} L${e.x1} ${yb} C${e.x1} ${yb + k} ${e.x2} ${yE - k} ${e.x2} ${yE}`; }
    h += `<path class="pe" d="${d}" marker-end="url(#pah)"/>`;
  }
  svg.setAttribute('width', g.scrollWidth); svg.setAttribute('height', g.scrollHeight); svg.innerHTML = h;
}
window.addEventListener('resize', pDrawEdges);
// La taille des cartes dépend des polices et des images : on retrace dès que la grille change de taille
let pRO = null;
function pWatch() {
  if (pRO) pRO.disconnect();
  const g = document.getElementById('pgrid'); if (!g || typeof ResizeObserver === 'undefined') return;
  pRO = new ResizeObserver(() => pDrawEdges()); pRO.observe(g);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pDrawEdges);
}
