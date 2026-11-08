// ===== Flux de quêtes : ce qu'il reste à faire pour obtenir un Dofus, un titre, un ornement ou un succès, en graphe de haut en bas.
// Un rond par quête restante (le plus gros : celle qui n'ouvre plus rien), un trait par « exige » ; tout converge vers un rond orange, la cible.
// Seules les quêtes restantes sont dessinées : les faites sont masquées. Survol : infos de la quête ; clic : sa fiche.
let fxMode = store.get('fxMode', 'graph');   // présentation des quêtes restantes : 'graph' | 'list'
const FX_CW = 42, FX_CWMIN = 24, FX_MAXW = 350, FX_RH = 46, FX_PAD = 22;   // colonnes resserrées pour que le graphe tienne dans la fiche (au plus FX_MAXW de large)
const FX_LBL = { av: 'disponible', st: 'commencée', bl: 'bloquée', lock: 'indisponible', done: 'faite' };
// Quêtes d'un succès exigé par une quête (ses objectifs, sous-succès compris)
function fxAchQuests(aid, seen = new Set()) {
  if (seen.has(aid)) return []; seen.add(aid);
  const out = [];
  for (const oid of (SACH[aid] || { ob: [] }).ob) { const o = SC.objectifs[oid]; if (!o) continue; if (o.t === 'q') out.push(+o.r); else if (o.t === 'a') out.push(...fxAchQuests(o.r, seen)); }
  return out;
}
// Modèle : rang (longueur de la plus longue chaîne avant) et colonne (une chaîne par colonne) de chaque quête
function fxModel(qs) {
  const S = new Set([...qs].filter(q => SC.quetes[q])), pre = new Map(), dashed = new Set();
  for (const q of S) {
    const ps = new Set((SC.quetes[q].pre || []).filter(p => S.has(p)));
    for (const a of SC.quetes[q].preA || []) for (const p of fxAchQuests(a)) if (S.has(p) && p !== q && !ps.has(p)) { ps.add(p); dashed.add(p + '>' + q); }
    pre.set(q, [...ps]);
  }
  const rank = new Map(), busy = new Set();
  const rk = q => { if (rank.has(q)) return rank.get(q); if (busy.has(q)) return 0; busy.add(q); const r = pre.get(q).length ? 1 + Math.max(...pre.get(q).map(rk)) : 0; busy.delete(q); rank.set(q, r); return r; };
  [...S].forEach(rk);
  const hasNext = new Set(); for (const q of S) pre.get(q).forEach(p => hasNext.add(p));
  const sinks = [...S].filter(q => !hasNext.has(q));
  const col = new Map(); let nc = 0;
  const walk = (q, c) => { if (col.has(q)) return; col.set(q, c); pre.get(q).slice().sort((x, y) => rank.get(y) - rank.get(x)).forEach((p, i) => { if (!col.has(p)) walk(p, i === 0 ? c : nc++); }); };
  sinks.sort((x, y) => rank.get(y) - rank.get(x) || x - y).forEach(q => { if (!col.has(q)) walk(q, nc++); });
  [...S].forEach(q => { if (!col.has(q)) walk(q, nc++); });
  return { S, pre, dashed, rank, col, nc, sinks: new Set(sinks), maxr: Math.max(0, ...rank.values()) };
}
// Liste : dans l'ordre où on les fait (une quête après celles qu'elle exige)
function fluxList(qs) {
  const m = fxModel(qs);
  return `<div class="fx-list">${[...m.S].sort((x, y) => m.rank.get(x) - m.rank.get(y) || (SC.quetes[x].lv || 0) - (SC.quetes[y].lv || 0) || x - y).map(q =>
    `<div class="ob"><span class="gcn round ${qCls(q)}"></span><span><span class="sgo" data-pick="q:${q}">${esc(qName(q))}</span></span><span class="lv">${SC.quetes[q].lv ? 'Niv. ' + SC.quetes[q].lv : ''}</span></div>`).join('')}</div>`;
}
// Section de fiche : titre, compteur de quêtes, bascule liste / graphe
function fluxSection(qs, target, lab = 'Il reste') {
  const todo = [...qs].filter(q => SC.quetes[q]);
  if (!todo.length) return '';
  const count = plural(todo.length, 'quête') + ' à faire';
  if (todo.length < 2) return `<div class="lab">${lab}</div><div class="ob"><span>${count}</span></div>${fluxList(todo)}`;
  const seg = `<div class="seg fx-seg" role="group" aria-label="Présentation">${[['graph', 'Graphe'], ['list', 'Liste']].map(([k, l]) => `<button type="button" class="seg-b" data-fxmode="${k}" aria-pressed="${fxMode === k}">${l}</button>`).join('')}</div>`;
  return `<div class="lab">${lab}</div><div class="fx-head"><span>${count}</span>${seg}</div>${fxMode === 'list' ? fluxList(todo) : fluxHtml(todo, target)}`;
}
function fluxHtml(qs, target) {
  const m = fxModel(qs); if (m.S.size < 2) return '';
  const cw = m.nc > 1 ? Math.max(FX_CWMIN, Math.min(FX_CW, (FX_MAXW - FX_PAD * 2) / (m.nc - 1))) : FX_CW, inner = FX_PAD * 2 + (m.nc - 1) * cw;
  const W = Math.max(150, inner), off = (W - inner) / 2, R = 9;   // R : rayon des pastilles (toutes de même taille)
  const X = q => off + FX_PAD + m.col.get(q) * cw, Y = q => FX_PAD + m.rank.get(q) * FX_RH;
  const ty = FX_PAD * 2 + m.maxr * FX_RH + FX_RH * 0.9, bus = ty - 24, H = ty + FX_PAD;
  const xs = [...m.sinks].map(X), cx = W / 2;   // la cible est au milieu du graphe ; le bus va jusqu'à elle même si les départs sont d'un seul côté
  let e = '', n = '';
  for (const q of m.S) for (const p of m.pre.get(q)) {
    const x1 = X(p), y1 = Y(p) + R, x2 = X(q), y2 = Y(q) - R, mid = y2 - FX_RH / 2 + 4;
    e += `<path class="fx-e${m.dashed.has(p + '>' + q) ? ' d' : ''}" d="M${x1} ${y1}V${x1 === x2 ? y2 : `${mid}H${x2}V${y2}`}"/>`;
  }
  for (const q of m.sinks) e += `<path class="fx-e" d="M${X(q)} ${Y(q) + R}V${bus}"/>`;
  e += `<path class="fx-e" d="M${Math.min(cx, ...xs)} ${bus}H${Math.max(cx, ...xs)}"/><path class="fx-e" d="M${cx} ${bus}V${ty - R}"/>`;
  // les pastilles sont celles des listes (vert disponible, jaune commencée, rouge bloquée, pointillé indisponible)
  for (const q of m.S) n += `<span class="gcn round ${qCls(q)}${isPick('q', q) ? ' sel' : ''}" style="left:${X(q) - R}px;top:${Y(q) - R}px" data-pick="q:${q}" data-fx="${q}" tabindex="0" role="button" aria-label="${esc(qName(q))}"></span>`;
  n += `<span class="fx-t" style="left:${cx - R}px;top:${ty - R}px" title="${esc(target)}"></span>`;
  return `<div class="fx" aria-label="Flux de quêtes jusqu'à ${esc(target)}"><div class="fx-c" style="width:${W}px;height:${H}px"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${e}</svg>${n}</div></div>`;
}
// Infobulle au survol d'un rond
(() => {
  const tip = document.createElement('div'); tip.id = 'fxTip'; document.body.appendChild(tip);
  document.addEventListener('mouseover', ev => {
    const c = ev.target.closest && ev.target.closest('.gcn[data-fx]'); if (!c) { tip.style.display = 'none'; return; }
    const id = +c.dataset.fx, q = SC.quetes[id] || {}, sp = (q.sp || [])[0], ft = (q.ft || [])[0];
    tip.innerHTML = `<b>${esc(qName(id))}</b>${q.lv ? `niv. ${q.lv} · ` : ''}${FX_LBL[qStatus(id)]}${sp ? `<br>Début : ${esc(sp.n || 'PNJ')}${sp.x !== undefined ? ` [${sp.x}, ${sp.y}]` : ''}` : ''}${ft ? `<br>${esc(ft)}` : ''}`;
    tip.style.display = 'block';
  });
  document.addEventListener('mousemove', ev => { if (tip.style.display === 'block') { tip.style.left = Math.min(ev.clientX + 14, innerWidth - 270) + 'px'; tip.style.top = Math.min(ev.clientY + 14, innerHeight - 110) + 'px'; } });
})();
