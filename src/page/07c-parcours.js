// ===== Parcours des Dofus : une grille lue de haut en bas, une colonne par famille, des flèches pour ce qui en demande un autre.
// La structure vient de l'analyse des prérequis DofusDB (quêtes, succès, Dofus à posséder) ; elle est écrite ici car DofusDB ne la donne pas.
// Les Dofus sont désignés par leur nom, les succès et quêtes par leur identifiant : un nom absent des données est ignoré, et tout Dofus
// qui n'est pas placé arrive dans « Indépendants », rangé par niveau puis par effort restant. Dofawa est masqué (SDZ_HIDDEN).
const PRIM = ['Dofus Ocre', 'Dofus Émeraude', 'Dofus Pourpre', 'Dofus Turquoise', 'Dofus Ébène', 'Dofus Ivoire'];
// r = ligne, c = colonne (1 à 6), s = nombre de colonnes occupées. La ligne 1 porte les titres de colonne.
const PN = [
  { id: 'deb', q: 1962, r: 2, c: 1 },                                  // « Ça sent le gaz » puis « Balade en forêt » : départ d'Argenté et de la série primordiale
  { id: 'arg', d: 'Dofus Argenté', r: 3, c: 1 },
  { id: 'mais', ach: 1036, r: 3, c: 2, s: 2 },                          // « Mais où sont les Dofus ? » : le tronc commun des six primordiaux
  { id: 'six', ach: 1705, r: 7, c: 2, s: 2 },                           // « Six sur six » : demande les six primordiaux ; ouvre Sylvestre
  { id: 'scint', d: 'Dofus Argenté Scintillant', r: 8, c: 1 },
  { id: 'domakuro', d: 'Domakuro', r: 2, c: 4 },
  { id: 'dorigami', d: 'Dorigami', r: 3, c: 4 },
  { id: 'mdlm', q: 2200, r: 4, c: 4 },                                  // « Main dans la main » : première quête de Tacheté, passage obligé de Verdoyant, Cauchemar et Sylvestre
  { id: 'tach', d: 'Dofus Tacheté', r: 5, c: 4 },
  { id: 'verd', d: 'Dofus Verdoyant', r: 5, c: 5 },
  { id: 'cauch', d: 'Dofus du Cauchemar', r: 6, c: 4 },                 // sa chaîne passe par la dernière quête de Tacheté
  { id: 'pin', d: 'Dom de Pin', r: 7, c: 5 },                           // exigé par la quête « Flovoraison » (Sylvestre) ; à cocher à la main
  { id: 'sylv', d: 'Dofus Sylvestre', r: 8, c: 4 },
  { id: 'veill', d: 'Dofus des Veilleurs', r: 10, c: 1 },
  { id: 'neb', d: 'Dofus Nébuleux', r: 11, c: 1 },
];
// Les six primordiaux : placés dans l'ordre (niveau puis effort), deux par ligne, dans un cadre commun (pas de chaîne entre eux)
const PRIM_SLOTS = [[4, 2], [4, 3], [5, 2], [5, 3], [6, 2], [6, 3]];
const PBOX = { id: 'prim', r: 4, c: 2, rows: 3 };
// Flèches : ['de', 'vers', type]  v = descend ; lg = longe la gouttière de gauche ; el = coude (part du côté gauche du cadre)
const PE = [['deb', 'arg'], ['deb', 'mais'], ['mais', 'prim'], ['prim', 'six'], ['arg', 'scint', 'lg'], ['prim', 'scint', 'el'],
  ['domakuro', 'dorigami'], ['dorigami', 'mdlm'], ['mdlm', 'tach'], ['mdlm', 'verd'], ['tach', 'cauch'],
  ['six', 'sylv'], ['mdlm', 'sylv', 'lg'], ['pin', 'sylv'], ['veill', 'neb']];
const PLABELS = [{ n: 'Argenté', r: 1, c: 1 }, { n: 'Série primordiale', r: 1, c: 2, s: 2 }, { n: 'Série Pandala', r: 1, c: 4, s: 2 },
  { n: 'Dimensions Divines', r: 9, c: 1 }, { n: 'Indépendants', r: 1, c: 6 }];
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
  const sub = [lvTxt, left ? `${left} q.` : (!own && !link ? 'à cocher' : '')].filter(Boolean).join(' · ');
  return `<div class="cz${own ? ' own' : ''}${goal ? ' goal' : ''}${ready ? ' ready' : ''}${isPick('d', d.id) ? ' sel' : ''}" id="cz-${id}" style="${pos}" data-pick="d:${d.id}" tabindex="0" role="button" title="${esc(d.n)}">
    <img src="${itemImg(d)}" alt="" loading="lazy" referrerpolicy="no-referrer">
    <span class="cz-t"><b>${esc(d.n.replace(/^Dofus (?=\S)/, 'Dofus '))}</b><small>${esc(sub)}</small>${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span>
    <span class="cz-c">${own ? '' : `<button type="button" class="tgt${goal ? ' on' : ''}" data-rgoal="d:${d.id}" aria-pressed="${goal}" title="${goal ? 'Retirer des objectifs' : 'En faire un objectif'}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg></button>`}<button type="button" class="cz-ok" data-sdzown="${d.id}" title="${own ? 'Marquer comme non obtenu' : 'Marquer comme obtenu (avec la cascade de ses quêtes)'}">${own ? '↺' : '✓'}</button></span>
  </div>`;
}
// Carte d'un succès ou d'une quête qui sert de passage (tronc commun, départ commun, « Six sur six »)
function pPivot(n, pos, after, ready) {
  const dn = pDoneNode(n);
  if (n.ach) { const a = SACH[n.ach]; if (!a) return ''; const [d, t] = achProg(a);
    return `<div class="cz pv${dn ? ' own' : ''}${ready ? ' ready' : ''}" id="cz-${n.id}" style="${pos}" data-sgo="${a.id}" tabindex="0" role="button" title="Voir le succès « ${esc(a.n)} »"><img src="${achImg(a)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="cz-t"><b>${esc(a.n)}</b><small>Succès · ${d} / ${t}</small>${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span></div>`; }
  if (!SC.quetes[n.q]) return '';
  return `<div class="cz pv${dn ? ' own' : ''}${ready ? ' ready' : ''}" id="cz-${n.id}" style="${pos}" data-goq="${n.q}" tabindex="0" role="button" title="Voir la quête « ${esc(qName(n.q))} »">${qIcon(SC.quetes[n.q], n.q)}<span class="cz-t"><b>${esc(qName(n.q))}</b><small>Quête${dn ? '' : ''}</small>${after ? `<small class="cz-after">${esc(after)}</small>` : ''}</span></div>`;
}
const pPos = (r, c, s = 1, rows = 1) => `grid-row:${r}${rows > 1 ? ` / span ${rows}` : ''};grid-column:${c}${s > 1 ? ` / span ${s}` : ''};order:${r * 10 + c}`;

function parcoursHtml() {
  const edgeIn = {}; for (const [a, b] of PE) (edgeIn[b] = edgeIn[b] || []).push(a);
  const ready = id => { const n = pNode(id); return !pDoneNode(n) && (edgeIn[id] || []).every(x => pDoneNode(pNode(x))); };
  const after = id => (edgeIn[id] || []).map(x => pName(pNode(x))).filter(Boolean);
  const out = [];
  out.push(...PLABELS.map(l => `<h4 class="pl-h${l.n === 'Indépendants' ? ' pl-alone' : ''}" style="${pPos(l.r, l.c, l.s || 1)}${l.n === 'Indépendants' ? ';order:999' : ''}">${esc(l.n)}</h4>`));
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

// Flèches : tracées d'après la position réelle des cartes dans la grille
function pDrawEdges() {
  const g = document.getElementById('pgrid'), svg = document.getElementById('pedges'); if (!g || !svg) return;
  const box = id => { const e = document.getElementById('cz-' + id); return e ? { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight } : null; };
  let h = '<defs><marker id="pah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="currentColor"/></marker></defs>';
  for (const [a, b, kind] of PE) {
    const A = box(a), B = box(b); if (!A || !B) continue;
    let d;
    if (kind === 'lg') { const gx = Math.min(A.l, B.l) - 8; d = `M${A.l} ${A.t + A.h / 2} H${gx} V${B.t + B.h / 2} H${B.l - 1}`; }
    else if (kind === 'el') { const x = B.l + B.w / 2; d = `M${A.l} ${A.t + A.h - 14} H${x} V${B.t - 1}`; }
    else { const x1 = A.l + A.w / 2, y1 = A.t + A.h, x2 = B.l + B.w / 2, y2 = B.t - 1, my = (y1 + y2) / 2; d = `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`; }
    h += `<path class="pe" d="${d}" marker-end="url(#pah)"/>`;
  }
  svg.setAttribute('width', g.scrollWidth); svg.setAttribute('height', g.scrollHeight); svg.innerHTML = h;
}
window.addEventListener('resize', pDrawEdges);
