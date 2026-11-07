// ===== Parcours des Dofus : une grille lue de haut en bas, une colonne par famille, des flèches pour ce qui en demande un autre.
// La structure vient de l'analyse des prérequis DofusDB (quêtes, succès, Dofus à posséder) ; elle est écrite ici car DofusDB ne la donne pas.
// Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant : un nom absent des données est ignoré, et tout Dofus
// qui n'est pas placé arrive dans « Indépendants », rangé par niveau puis par effort restant. Dofawa est masqué (SDZ_HIDDEN).
const PRIM = ['Dofus Ocre', 'Dofus Émeraude', 'Dofus Pourpre', 'Dofus Turquoise', 'Dofus Ébène', 'Dofus Ivoire'];
// r = ligne (à partir de 2), c = colonne (1 à 6), s = nombre de colonnes occupées.
const PN = [
  { id: 'deb', q: 1962, r: 2, c: 1 },                                  // « Ça sent le gaz » puis « Balade en forêt » : départ d'Argenté et de la série primordiale
  { id: 'arg', d: 'Dofus Argenté', r: 3, c: 1 },
  { id: 'mais', ach: 1036, r: 3, c: 2, s: 2 },                          // « Mais où sont les Dofus ? » : le tronc commun des six primordiaux
  { id: 'six', ach: 1705, r: 8, c: 2, s: 2 },                           // « Six sur six » : demande les six primordiaux ; ouvre Sylvestre
  { id: 'scint', d: 'Dofus Argenté Scintillant', r: 8, c: 1 },
  { id: 'domakuro', d: 'Domakuro', r: 2, c: 4 },
  { id: 'dorigami', d: 'Dorigami', r: 3, c: 4 },
  { id: 'mdlm', q: 2200, r: 4, c: 4 },                                  // « Main dans la main » : première quête de Tacheté (demande Domakuro et Dorigami)
  { id: 'tach', d: 'Dofus Tacheté', r: 5, c: 4 },                       // la chaîne de Cauchemar passe par « En ce jardin qui nous unit », sa dernière quête sur le chemin
  { id: 'cauch', d: 'Dofus du Cauchemar', r: 6, c: 4 },                 // la quête de Verdoyant exige « Un héritage tourmenté » (3 des 4 quêtes de Cauchemar)
  { id: 'verd', d: 'Dofus Verdoyant', r: 7, c: 4 },                     // la chaîne de Sylvestre passe par la quête de Verdoyant
  { id: 'pin', d: 'Dom de Pin', r: 8, c: 5 },                           // exigé par la quête « Flovoraison » (Sylvestre) ; à cocher à la main
  { id: 'sylv', d: 'Dofus Sylvestre', r: 8, c: 4 },
  { id: 'veill', d: 'Dofus des Veilleurs', r: 10, c: 1 },
  { id: 'neb', d: 'Dofus Nébuleux', r: 11, c: 1 },
];
// Les six primordiaux : placés dans l'ordre (niveau puis effort), deux par ligne, dans un cadre commun (pas de chaîne entre eux)
const PRIM_SLOTS = [[4, 2], [4, 3], [5, 2], [5, 3], [6, 2], [6, 3]];
const PBOX = { id: 'prim', r: 4, c: 2, rows: 3 };
// Flèches : ['de', 'vers', type]. Toutes à angles droits : par défaut elles descendent (droit si les cartes sont alignées, sinon un palier au milieu) ;
// el = part du côté gauche du cadre ; r / l = à l'horizontale vers la droite / la gauche (cartes de la même ligne).
const PE = [['deb', 'arg'], ['deb', 'mais'], ['mais', 'prim'], ['prim', 'six'], ['arg', 'scint'], ['prim', 'scint', 'el'],
  ['domakuro', 'dorigami'], ['dorigami', 'mdlm'], ['mdlm', 'tach'], ['tach', 'cauch'], ['cauch', 'verd'], ['verd', 'sylv'],
  ['six', 'sylv', 'r'], ['pin', 'sylv', 'l'], ['veill', 'neb']];
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
    .sort((a, b) => { const k = d => (SDZLV[d.id] || [999, 999])[1]; return k(a) - k(b) || pLeft(a) - pLeft(b); });
  alone.forEach((d, i) => out.push(pCard(d, 'a' + d.id, `${pPos(2 + i, 6)};order:${1000 + i}`, '', false)));
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
  const R = id => { const e = document.getElementById('cz-' + id); if (!e) return null; const o = { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; o.r = o.l + o.w; o.b = o.t + o.h; o.cx = o.l + o.w / 2; o.cy = o.t + o.h / 2; return o; };
  let h = '<defs><marker id="pah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0.5L10 5L0 9.5z" fill="currentColor"/></marker></defs>';
  for (const [a, b, kind] of PE) {
    const A = R(a), B = R(b); if (!A || !B) continue;
    let pts;
    if (kind === 'r') pts = [[A.r, A.cy], [B.l - 3, A.cy]];
    else if (kind === 'l') pts = [[A.l, A.cy], [B.r + 3, A.cy]];
    else if (kind === 'el') pts = [[A.l, A.b - 20], [B.cx, A.b - 20], [B.cx, B.t - 3]];
    else if (Math.abs(A.cx - B.cx) < 3) pts = [[A.cx, A.b], [B.cx, B.t - 3]];
    else { const ym = A.b + (B.t - A.b) / 2; pts = [[A.cx, A.b], [A.cx, ym], [B.cx, ym], [B.cx, B.t - 3]]; }
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
