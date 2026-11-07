// ===== Parcours des Dofus : une grille lue de haut en bas, une colonne par famille, des flèches pour ce qui en demande un autre.
// La structure vient de l'analyse des prérequis DofusDB (quêtes, succès, Dofus à posséder) ; elle est écrite ici car DofusDB ne la donne pas.
// Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant : un nom absent des données est ignoré, et tout Dofus
// qui n'est pas placé arrive dans « Indépendants », rangé par niveau puis par effort restant. Dofawa est masqué (SDZ_HIDDEN).
const PRIM = ['Dofus Ocre', 'Dofus Émeraude', 'Dofus Pourpre', 'Dofus Turquoise', 'Dofus Ébène', 'Dofus Ivoire'];
// Position verticale = niveau : une ligne par étape, regroupées en paliers de niveau (PBANDS). Chaque Dofus est rangé selon son niveau de fin
// (SDZLV) ; ce qui dépend d'un autre Dofus est toujours plus bas. r = ligne (à partir de 2), c = colonne (1 à 6), s = colonnes occupées.
const PBANDS = [[3, 50], [5, 100], [6, 150], [7, 200]];   // [première ligne du palier suivant, niveau où il commence] : traits discrets entre les paliers
const PN = [
  { id: 'arg', d: 'Dofus Argenté', r: 2, c: 1 },                          // niv. 2–40
  { id: 'mais', ach: 1036, r: 2, c: 2, s: 2 },                          // « Mais où sont les Dofus ? » : les quêtes d'introduction des Dofus (niv. 30–40), tronc commun des six primordiaux
  { id: 'cawotte', d: 'Dofus Cawotte', r: 3, c: 3 },                    // niv. 60 ; rattaché à l'introduction des Dofus (indication du joueur : DofusDB ne donne pas ce lien)
  { id: 'veill', d: 'Dofus des Veilleurs', r: 3, c: 5 },                // niv. 100 ; Dimensions Divines : entre la série Pandala et les indépendants
  { id: 'neb', d: 'Dofus Nébuleux', r: 4, c: 5 },
  { id: 'domakuro', d: 'Domakuro', r: 5, c: 4 },                         // niv. 30–140
  { id: 'dorigami', d: 'Dorigami', r: 6, c: 4 },                         // niv. 160–170
  { id: 'pin', d: 'Dom de Pin', r: 6, c: 5 },                           // niv. 180 ; exigé par la quête « Flovoraison » (Sylvestre) ; à cocher à la main
  { id: 'tach', d: 'Dofus Tacheté', r: 7, c: 4 },                       // la chaîne de Cauchemar passe par « En ce jardin qui nous unit », sa dernière quête sur le chemin
  { id: 'six', ach: 1705, r: 8, c: 2, s: 2 },                           // « Six sur six » (6/6) : les six primordiaux et leurs quêtes finales ; ouvre Scintillant et Sylvestre
  { id: 'cauch', d: 'Dofus du Cauchemar', r: 8, c: 4 },                 // la quête de Verdoyant exige « Un héritage tourmenté » (3 des 4 quêtes de Cauchemar)
  { id: 'scint', d: 'Dofus Argenté Scintillant', r: 9, c: 2 },          // demande Argenté et presque tout « Six sur six » (il lui manque ses deux dernières quêtes)
  { id: 'verd', d: 'Dofus Verdoyant', r: 9, c: 4 },                     // la chaîne de Sylvestre passe par la quête de Verdoyant
  { id: 'sylv', d: 'Dofus Sylvestre', r: 10, c: 4 },
];
// Les six primordiaux : placés dans l'ordre (niveau puis effort), deux par ligne, dans un cadre commun (pas de chaîne entre eux)
const PRIM_SLOTS = [[5, 2], [5, 3], [6, 2], [6, 3], [7, 2], [7, 3]];
const PBOX = { id: 'prim', r: 5, c: 2, rows: 3 };
const PALONE_ROWS = [2, 3, 5, 6, 7];   // première ligne des indépendants pour : ≤ 50, 51–100, 101–150, 151–199, 200
// Flèches : ['de', 'vers']. Une flèche va toujours vers le bas (ce qui est dessous dépend de ce qui est dessus), à angles droits :
// droite si les cartes sont alignées, sinon elle descend, longe l'espace juste au-dessus de la cible, puis descend dedans.
const PE = [['mais', 'cawotte'], ['mais', 'prim'], ['prim', 'six'], ['arg', 'scint'], ['six', 'scint'],
  ['domakuro', 'dorigami'], ['dorigami', 'tach'], ['tach', 'cauch'], ['cauch', 'verd'], ['verd', 'sylv'],
  ['six', 'sylv'], ['pin', 'sylv'], ['veill', 'neb']];
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
const pPos = (r, c, s = 1, rows = 1) => `grid-row:${r - 1}${rows > 1 ? ` / span ${rows}` : ''};grid-column:${c}${s > 1 ? ` / span ${s}` : ''};order:${r * 10 + c}`;

function parcoursHtml() {
  const edgeIn = {}; for (const [a, b] of PE) (edgeIn[b] = edgeIn[b] || []).push(a);
  const ready = id => { const n = pNode(id); return !pDoneNode(n) && (edgeIn[id] || []).every(x => pDoneNode(pNode(x))); };
  const after = id => (edgeIn[id] || []).map(x => pName(pNode(x))).filter(Boolean);
  const out = [];
  for (const n of PN) {
    const aft = after(n.id).length ? 'après ' + after(n.id).join(', ') : '', pos = pPos(n.r, n.c, n.s || 1);
    if (n.d) { const d = pDofus(n.d); if (d && sdzVisible(d) && rwShown(d)) out.push(pCard(d, n.id, pos, aft, ready(n.id))); }
    else out.push(pPivot(n, pos, aft, ready(n.id)));
  }
  // les six primordiaux : un cadre, six cartes sans lien entre elles
  const prim = PRIM.map(pDofus).filter(Boolean).sort((a, b) => SDZ_ORDER.indexOf(a) - SDZ_ORDER.indexOf(b)), shown = prim.filter(d => sdzVisible(d) && rwShown(d));
  if (shown.length) {
    out.push(`<div class="pbox" id="cz-prim" style="${pPos(PBOX.r, PBOX.c, 2, PBOX.rows)}" aria-hidden="true"></div>`);
    prim.forEach((d, i) => { if (shown.includes(d)) out.push(pCard(d, 'p' + i, pPos(PRIM_SLOTS[i][0], PRIM_SLOTS[i][1]), 'après ' + pName(PN.find(n => n.id === 'mais')), false)); });
  }
  const alone = SDZ_ORDER.filter(d => !pPlaced.has(d.n) && sdzVisible(d) && rwShown(d))
    .sort((a, b) => { const hi = d => (SDZLV[d.id] || [999, 999])[1], lo = d => (SDZLV[d.id] || [999, 999])[0];
      return hi(a) - hi(b) || lo(a) - lo(b) || pLeft(a) - pLeft(b); });   // niveau de fin, puis de départ, puis effort
  let last = 0;
  alone.forEach(d => {
    const hi = (SDZLV[d.id] || [999, 999])[1], band = hi <= 50 ? 0 : hi <= 100 ? 1 : hi <= 150 ? 2 : hi < 200 ? 3 : 4;
    const row = Math.max(PALONE_ROWS[band], last + 1); last = row;
    out.push(pCard(d, 'a' + d.id, `${pPos(row, 6)};order:${1000 + row}`, '', false));
  });
  out.unshift(...PBANDS.map(([r, lv]) => `<div class="pband" style="grid-row:${r - 1};grid-column:1 / -1"><span>niv. ${lv}</span></div>`));
  return `<div class="pwrap"><div class="pgrid" id="pgrid"><svg class="pedges" id="pedges" aria-hidden="true"></svg>${out.join('')}</div></div>`;
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
    if (lo <= hi) { const x = Math.min(Math.max(e.x2, lo), hi); e.x1 = e.x2 = x; }
    if (Math.abs(e.x1 - e.x2) < 3) pts = [[e.x1, A.b], [e.x2, B.t - 3]];
    else {
      // le palier horizontal est dans l'espace libre juste au-dessus de la carte cible (jamais dans la rangée d'au-dessus), avec de la place pour la pointe ;
      // deux flèches vers la même carte arrivent de côtés différents : leurs paliers ne se recouvrent pas
      const lo = A.b + 14, hi = B.t - 20, ym = lo > hi ? (A.b + B.t) / 2 : Math.min(Math.max(B.t - 28, lo), hi);
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
