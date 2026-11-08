// ===== Parcours des Dofus : une grille lue de haut en bas, une colonne par famille, des flèches pour ce qui en demande un autre.
// La structure vient de l'analyse des prérequis DofusDB (quêtes, succès, Dofus à posséder) ; elle est écrite ici car DofusDB ne la donne pas.
// Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant : un nom absent des données est ignoré, et tout Dofus
// qui n'est pas placé arrive dans « Indépendants », rangé par niveau puis par effort restant. Dofawa est masqué (SDZ_HIDDEN).
const PRIM = ['Dofus Ocre', 'Dofus Émeraude', 'Dofus Pourpre', 'Dofus Turquoise', 'Dofus Ébène', 'Dofus Ivoire'];
// Disposition : une ligne par étape de niveau, partagée par toutes les familles (ce qui est à la même hauteur se fait à peu près au même niveau) ;
// horizontalement, pas de colonnes régulières : chaque famille a son décalage (PLANES, en pixels). Ce qui dépend d'un autre Dofus est toujours plus bas.
// Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant. r = ligne, lane = position horizontale, s = largeur en cartes.
const PW = 156, PSTEP = 172, PNH = 72, PGAP = 40, PGAP_STRAIGHT = 28, PGAP_MIN = 16;   // largeur d'une carte, pas entre deux cartes voisines, hauteur d'une ligne, espace avant une ligne où arrive un coude / une flèche droite / rien
const PLANES = { A: 0, M1: 172, M2: 344, P: 532, D: 704, I1: 876, I2: 1048 };   // Argenté ; les deux colonnes des primordiaux ; Pandala ; Dimensions Divines ; indépendants
const PBANDS = [[3, 50], [4, 100], [6, 150], [7, 200]];   // [première ligne du palier, niveau où il commence] : un trait « niv. N » veut dire « niveau N ou plus » (un Dofus de niveau 100 est sous le trait 100)
const PN = [
  { id: 'arg', d: 'Dofus Argenté', lane: 'A', r: 2 },                              // niv. 2–40
  { id: 'mais', ach: 1036, lane: 'M1', s: 2, r: 2 },                              // « Mais où sont les Dofus ? » : les quêtes d'introduction des Dofus (niv. 30–40), tronc commun des six primordiaux
  { id: 'cawotte', d: 'Dofus Cawotte', lane: 'I1', r: 3 },                        // niv. 60 ; rattaché à l'introduction des Dofus (indication du joueur : DofusDB ne donne pas ce lien)
  { id: 'veill', d: 'Dofus des Veilleurs', lane: 'D', r: 4 },                    // niv. 100 ; Dimensions Divines : entre la série Pandala et les indépendants
  { id: 'domakuro', d: 'Domakuro', lane: 'P', r: 4 },                             // niv. 30–140
  { id: 'dorigami', d: 'Dorigami', lane: 'P', r: 6 },                              // niv. 160–170
  { id: 'tach', d: 'Dofus Tacheté', lane: 'P', r: 7 },                            // la chaîne de Cauchemar passe par « En ce jardin qui nous unit », sa dernière quête sur le chemin
  { id: 'neb', d: 'Dofus Nébuleux', lane: 'D', r: 7 },                            // niv. 100–200 : niveau de fin 200
  { id: 'cauch', d: 'Dofus du Cauchemar', lane: 'P', r: 8 },                      // la chaîne de Sylvestre passe par « Un héritage tourmenté » (3 des 4 quêtes de Cauchemar) puis par la quête de Verdoyant, un objet de quête masqué
  { id: 'six', ach: 1705, lane: 'M1', s: 2, r: 8 },                               // « Six sur six » (6/6) : les six primordiaux et leurs quêtes finales
  { id: 'scint', d: 'Dofus Argenté Scintillant', lane: 'M1', r: 9 },              // demande Argenté et presque tout « Six sur six » (il lui manque ses deux dernières quêtes)
  { id: 'pin', d: 'Dom de Pin', lane: 'M2', r: 9 },                               // s'achète à un PNJ une fois « Six sur six », « L'héritage de l'île brisée » et la quête « Entretemps, une renaissance » faits ; exigé par « Flovoraison » (Sylvestre)
  { id: 'sylv', d: 'Dofus Sylvestre', lane: 'P', r: 10 },
];
// Les six primordiaux : deux par ligne (lignes 4, 6 et 7, selon leur niveau), dans un cadre commun, sans lien entre eux (ils dépendent tous du tronc commun)
const PRIM_SLOTS = [[4, 'M1'], [4, 'M2'], [6, 'M1'], [6, 'M2'], [7, 'M1'], [7, 'M2']];
const PBOX = { id: 'prim' };
const PALONE_FIRST = [2, 3, 4, 6, 7];   // première ligne des indépendants pour : < 50, 50–99, 100–149, 150–199, 200
// Flèches : ['de', 'vers']. Une flèche va toujours vers le bas (ce qui est dessous dépend de ce qui est dessus).
const PE = [['mais', 'cawotte'], ['mais', 'prim'], ['prim', 'six'], ['arg', 'scint'], ['six', 'scint'],
  ['domakuro', 'dorigami'], ['dorigami', 'tach'], ['tach', 'cauch'], ['cauch', 'sylv'],
  ['six', 'pin'], ['pin', 'sylv'], ['veill', 'neb']];
const pDofus = name => SDZL.find(d => d.n === name);
const pNode = id => (id === 'prim' ? PBOX : PN.find(n => n.id === id));
const pPlaced = new Set(PN.filter(n => n.d).map(n => n.d).concat(PRIM));
const pLeft = d => collectPrereqs('d', d.id).q.size;
const pDoneNode = n => n.id === 'prim' ? PRIM.map(pDofus).filter(Boolean).every(sdzOwned)
  : n.d ? (pDofus(n.d) ? sdzOwned(pDofus(n.d)) : true) : n.ach ? achDone(n.ach) : qDoneS(n.q);
const pName = n => n.id === 'prim' ? 'les 6 primordiaux' : n.d ? n.d.replace(/^Dofus /, '') : n.ach ? (SACH[n.ach] || {}).n : qName(n.q);

// Carte compacte d'un Dofus : image, nom, niveau et effort. Un clic ouvre la fiche (objectif, obtenu) ; le ◎ suit le Dofus d'un geste ; l'état se lit sur la carte (verte : obtenu, contour orange : objectif).
function pCard(d, id, pos, after, ready) {
  const own = sdzOwned(d), goal = !own && sdzGoals.has(d.id), left = own ? 0 : pLeft(d), lv = SDZLV[d.id];
  const lvTxt = lv ? (lv[0] === lv[1] ? `niv. ${lv[0]}` : `niv. ${lv[0]}–${lv[1]}`) : '', link = d.a || d.q || d.pa;
  const eff = left ? `${plural(left, 'quête')}` : (!own && !link ? 'à cocher' : '');
  return `<div class="cz${own ? ' own' : ''}${goal ? ' goal' : ''}${ready ? ' ready' : ''}${isPick('d', d.id) ? ' sel' : ''}" id="cz-${id}" style="${pos}" data-pick="d:${d.id}" tabindex="0" role="button" title="${esc(d.n)}">
    <img src="${itemImg(d)}" alt="" loading="lazy" referrerpolicy="no-referrer">
    <span class="cz-t"><b>${esc(d.n.replace(/^Dofus (?=\S)/, 'Dofus '))}</b><small>${esc(lvTxt)}</small>${eff ? `<small>${esc(eff)}</small>` : ''}${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span>
    ${own ? '' : `<span class="cz-c"><button type="button" class="tgt${goal ? ' on' : ''}" data-rgoal="d:${d.id}" aria-pressed="${goal}" title="${goal ? 'Retirer des objectifs' : 'En faire un objectif'}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg></button></span>`}
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
// Ordonnée du trait de niveau avant la ligne r : juste sous la ligne précédente (rien ne se met entre le bloc et le trait), loin de la pointe des flèches
const pBandY = r => (r === 1 ? 6 : pTops[r - 1] + PNH + 6);
let pTops = [];   // ordonnée du haut de chaque ligne (à partir de 1) : l'espace avant une ligne n'est complet que si une flèche y arrive
const pRowTop = r => pTops[r];
const pRect = (lane, r, span = 1) => ({ l: PLANES[lane], t: pRowTop(r), w: span * PW + (span - 1) * (PSTEP - PW), h: PNH });
const pStyle = (rc, order) => `left:${rc.l}px;top:${rc.t}px;width:${rc.w}px;order:${order}`;

function parcoursHtml() {
  const edgeIn = {}; for (const [a, b] of PE) (edgeIn[b] = edgeIn[b] || []).push(a);
  const ready = id => { const n = pNode(id); return !pDoneNode(n) && (edgeIn[id] || []).every(x => pDoneNode(pNode(x))); };
  const after = id => (edgeIn[id] || []).map(x => pName(pNode(x))).filter(Boolean);
  const hi = d => (SDZLV[d.id] || [200, 200])[1], lo = d => (SDZLV[d.id] || [200, 200])[0];
  const prim = PRIM.map(pDofus).filter(Boolean).sort((a, b) => SDZ_ORDER.indexOf(a) - SDZ_ORDER.indexOf(b));
  // 1. ce qui s'affiche, et sur quelle ligne : { row, lane, span, build(style, ordre) → html }
  const items = [];
  for (const n of PN) {
    const aft = after(n.id).length ? 'après ' + after(n.id).join(', ') : '';
    if (n.d) { const d = pDofus(n.d); if (d && sdzVisible(d) && rwShown(d)) items.push({ id: n.id, row: n.r, lane: n.lane, span: n.s, build: st => pCard(d, n.id, st, aft, ready(n.id)) }); }
    else if (pPivot(n, '', '', false)) items.push({ id: n.id, row: n.r, lane: n.lane, span: n.s, build: st => pPivot(n, st, aft, ready(n.id)) });
  }
  const primItems = [];
  prim.forEach((d, i) => { if (!sdzVisible(d) || !rwShown(d)) return; const [row, lane] = PRIM_SLOTS[i];
    const it = { id: 'prim:' + i, row, lane, build: st => pCard(d, 'p' + i, st, 'après ' + pName(pNode('mais')), false) }; items.push(it); primItems.push(it); });
  // les indépendants : par niveau de fin, puis de départ, puis effort ; deux par ligne, à partir de la première ligne de leur palier
  const alone = SDZ_ORDER.filter(d => !pPlaced.has(d.n) && sdzVisible(d) && rwShown(d)).sort((a, b) => hi(a) - hi(b) || lo(a) - lo(b) || pLeft(a) - pLeft(b));
  const taken = new Set(items.map(it => it.row + ':' + it.lane));   // cases déjà prises (Dofus du parcours, saisonniers compris) : un indépendant ne s'y pose jamais
  alone.forEach(d => {
    const h = hi(d), band = h < 50 ? 0 : h < 100 ? 1 : h < 150 ? 2 : h < 200 ? 3 : 4;   // un trait N = « niveau N ou plus »
    let row = PALONE_FIRST[band], lane;
    while (!(lane = ['I1', 'I2'].find(l => !taken.has(row + ':' + l)))) row++;
    taken.add(row + ':' + lane);
    items.push({ id: 'a' + d.id, row, lane, build: st => pCard(d, 'a' + d.id, st, '', false) });
  });
  // 2. les lignes sans aucune carte disparaissent : quand on masque les obtenus, la grille se resserre
  const rows = [...new Set(items.map(it => it.row))].sort((a, b) => a - b), rowOf = r => rows.indexOf(r) + 1;
  // 3. espacement vertical, selon ce qui arrive sur la ligne : un coude (40 px), une flèche droite seule (28 px), rien (16 px)
  const rowOfId = {}, xOf = {};
  const span = it => (it.span || 1) * PW + ((it.span || 1) - 1) * (PSTEP - PW);
  for (const it of items) { rowOfId[it.id] = rowOf(it.row); xOf[it.id] = { l: PLANES[it.lane], w: span(it) }; }
  if (primItems.length) {
    rowOfId.prim = Math.min(...primItems.map(it => rowOf(it.row)));
    const l = Math.min(...primItems.map(it => PLANES[it.lane])) - 10, r = Math.max(...primItems.map(it => PLANES[it.lane] + PW)) + 10; xOf.prim = { l, w: r - l };
  }
  const need = {};   // ligne → espace nécessaire avant elle
  for (const [a, b] of PE) {
    if (!rowOfId[a] || !rowOfId[b]) continue;
    const A = xOf[a], B = xOf[b], overlap = Math.min(A.l + A.w, B.l + B.w) - Math.max(A.l, B.l);
    const straight = overlap >= 100 || Math.abs(A.l + A.w / 2 - B.l - B.w / 2) < 3;   // même règle que le tracé (pDrawEdges)
    const k = rowOfId[b]; need[k] = Math.max(need[k] || 0, straight ? PGAP_STRAIGHT : PGAP);
  }
  pTops = [0, 16]; for (let k = 2; k <= rows.length; k++) pTops[k] = pTops[k - 1] + PNH + (need[k] || PGAP_MIN);
  const out = [], rects = [];
  for (const it of items) { const rc = pRect(it.lane, rowOf(it.row), it.span); it.rc = rc; rects.push(rc); out.push(it.build(pStyle(rc, rowOf(it.row) * 10 + PLANES[it.lane] / 100))); }
  if (primItems.length) {
    const l = Math.min(...primItems.map(it => it.rc.l)) - 10, t = Math.min(...primItems.map(it => it.rc.t)) - 10, rr = Math.max(...primItems.map(it => it.rc.l + it.rc.w)) + 10, b = Math.max(...primItems.map(it => it.rc.t + it.rc.h)) + 10;
    out.unshift(`<div class="pbox" id="cz-prim" style="left:${l}px;top:${t}px;width:${rr - l}px;height:${b - t}px" aria-hidden="true"></div>`);
  }
  // 4. traits de niveau : un trait par palier qui a encore des cartes, juste au-dessus de sa première ligne
  const lines = PBANDS.map(([first, lv], i) => { const next = i + 1 < PBANDS.length ? PBANDS[i + 1][0] : Infinity, r = rows.find(x => x >= first && x < next); return r ? [rowOf(r), lv] : null; }).filter(Boolean);
  out.unshift(...lines.map(([r, lv]) => `<div class="pband" style="top:${pBandY(r)}px"><span>niv. ${lv}</span></div>`));
  const W = Math.max(0, ...rects.map(r => r.l + r.w)) + 20, H = Math.max(0, ...rects.map(r => r.t + r.h)) + 30;
  return `<div class="pwrap"><div class="pgrid" id="pgrid" style="width:${W}px;height:${H}px"><svg class="pedges" id="pedges" aria-hidden="true"></svg>${out.join('')}</div></div>`;
}

// Flèches : tracées d'après la position réelle des cartes ; segments droits, coins arrondis
function pRound(pts, r = 8) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const a = Math.min(r, Math.hypot(x - px, y - py) / 2), b = Math.min(r, Math.hypot(nx - x, ny - y) / 2);
    const ax = x - Math.sign(x - px) * a, ay = y - Math.sign(y - py) * a, bx = x + Math.sign(nx - x) * b, by = y + Math.sign(ny - y) * b;
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
  }
  const [lx, ly] = pts[pts.length - 1]; return d + ` L${lx} ${ly}`;
}
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
    const { A, B } = e; let pts;
    // Si les deux cartes se recouvrent à l'horizontale, la flèche descend tout droit : pas de petit décrochage qui se tord
    const lo = Math.max(A.l, B.l) + 12, hi = Math.min(A.r, B.r) - 12;
    if (lo <= hi && Math.min(A.r, B.r) - Math.max(A.l, B.l) >= 100) { const x = Math.min(Math.max(e.x2, lo), hi); e.x1 = e.x2 = x; }   // recouvrement net seulement : sinon la droite traverserait d'autres cartes
    if (Math.abs(e.x1 - e.x2) < 3) pts = [[e.x1, A.b], [e.x2, B.t - 3]];
    else {
      // le palier horizontal est dans l'espace libre juste au-dessus de la carte cible (jamais dans la rangée d'au-dessus), avec de la place pour la pointe ;
      // deux flèches vers la même carte arrivent de côtés différents : leurs paliers ne se recouvrent pas
      const lo = A.b + 14, hi = B.t - 20, ym = lo > hi ? (A.b + B.t) / 2 : Math.min(Math.max(B.t - 24, lo), hi);
      pts = [[e.x1, A.b], [e.x1, ym], [e.x2, ym], [e.x2, B.t - 3]];
    }
    h += `<path class="pe" d="${pRound(pts)}" marker-end="url(#pah)"/>`;
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
