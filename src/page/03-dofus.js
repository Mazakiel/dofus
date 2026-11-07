// ===== Dofus : liste, ordre d'obtention, niveaux, explications, et cartes de la bande des Dofus.
// ---- Dofus (DofusDB : objets de type Dofus, reliés au succès qui les donne, ou à la quête) ----
// Jyfus : cadeau d'Ankama, ne s'obtient pas en jeu ; Dofawa : trop court pour être un objectif, masqué partout
const SDZ_HIDDEN = new Set(['Dofawa']);
const SDZL = (SC.dofus || []).filter(d => !d.cadeau && !SDZ_HIDDEN.has(d.n));
const sdzVisible = d => sSeasonal || !d.s;
const itemImg = d => `https://api.dofusdb.fr/img/items/${d.ic}.png`;
const setSdzOwned = (d, on) => P.setDofusOwned(d, on);
const sdzSrc = d => d.pa ? `les succès « ${d.pa.map(a => SACH[a] ? SACH[a].n : a).join(" » et « ")} » (prérequis), puis un dialogue avec le PNJ — rattachement fait à la main, absent de DofusDB` : d.pre && d.a && SACH[d.a] ? `le succès « ${SACH[d.a].n} », qui n’en est qu’un prérequis : l’obtention elle-même n’est pas décrite dans DofusDB` : d.a && SACH[d.a] ? `le succès « ${SACH[d.a].n} »` : d.q ? `la quête « ${qName(d.q)} »${d.src === 'remis pendant la quête' ? ' (remis pendant la quête)' : d.src && d.src.startsWith('manuel') ? ' (remis par le PNJ en fin de quête ; rattachement fait à la main, absent de DofusDB)' : ''}` : '';
// Texte d'infobulle quand DofusDB ne dit pas comment obtenir le Dofus
// Explication affichée au clic sur le « i » d'une carte Dofus (le survol n'existe pas sur téléphone)
const dzWho = d => d.pnj ? `${typeof d.pnj === 'string' ? 'Remis par' : 'S’achète auprès de'} ${typeof d.pnj === 'string' ? d.pnj : d.pnj.map(p => p.n).join(' ou ')}.`
  : d.pa ? `Se débloque en finissant ${d.pa.map(a => `« ${SACH[a] ? SACH[a].n : a} »`).join(' et ')}, puis se récupère en dialoguant avec un PNJ. DofusDB ne dit pas lequel : à cocher à la main une fois obtenu.`
  : d.pre ? 'À cocher à la main : le succès lié n’en est qu’un prérequis, DofusDB ne décrit pas l’obtention.'
  : `Remis par un PNJ. DofusDB ne dit pas lequel${d.req ? ` ; il est requis pour la quête « ${d.req.map(qName).join(' », « ')} »` : ''}. À cocher à la main une fois obtenu.`;
const sdzNoLink = d => `remis par un PNJ : DofusDB ne précise pas comment l’obtenir${d.req ? ` · requis pour la quête « ${d.req.map(qName).join(' », « ')} »` : ''}`;
// Tranche de niveau d'un Dofus : niveaux des quêtes de son succès (et sous-succès), ou de sa quête — sans les prérequis lointains
function sdzOwnQuests(d){
  const Q = new Set(), seen = new Set();
  const ach = a => { if (seen.has(a)) return; seen.add(a); for (const oid of (SACH[a] || { ob: [] }).ob) { const o = SC.objectifs[oid]; if (!o) continue; if (o.t === 'q') Q.add(o.r); else if (o.t === 'a') ach(o.r); } };
  if (d.a) ach(d.a); if (d.q) Q.add(d.q); (d.pa || []).forEach(ach); (d.pq || []).forEach(q => Q.add(q));
  return [...Q];
}
// Tout ce qu'un Dofus demande (sans tenir compte des coches) : sert à savoir quel Dofus en demande un autre
function sdzClosure(d){
  const A = new Set(), Q = new Set();
  const quest = q => { if (Q.has(q)) return; Q.add(q); const x = SC.quetes[q]; if (!x) return; (x.pre || []).forEach(quest); (x.preA || []).forEach(ach);
    (x.preD || []).forEach(id => { const o = SDZ[id]; if (o) { if (o.a) ach(o.a); if (o.q) quest(o.q); (o.pa || []).forEach(ach); (o.pq || []).forEach(quest); } }); };
  const ach = a => { if (A.has(a)) return; A.add(a); for (const oid of (SACH[a] || { ob: [] }).ob) { const o = SC.objectifs[oid]; if (!o) continue; if (o.t === 'a') ach(o.r); else if (o.t === 'q') quest(o.r); } };
  if (d.a) ach(d.a); if (d.q) quest(d.q); (d.pa || []).forEach(ach); (d.pq || []).forEach(quest);
  return { A, Q };
}
const SDZLV = {};
for (const d of SDZL) { const lv = sdzOwnQuests(d).map(q => SC.quetes[q] && SC.quetes[q].lv).filter(x => x != null && x > 0);
  if (d.lvq) lv.push(d.lvq[1]);   // borne haute : étape la plus haute de la quête ; borne basse : niveau minimum de la quête
  SDZLV[d.id] = Array.isArray(d.pnj) && d.lv ? [d.lv, d.lv]   // s'achète à un PNJ : le niveau de l'objet, pas celui de toute sa chaîne de prérequis
    : lv.length ? [Math.min(...lv), Math.max(...lv)] : (d.lv ? [d.lv, d.lv] : null); }
// Ordre d'obtention : un Dofus requis par un autre passe avant ; sinon par niveau (max, puis min) ; les Dofus sans lien à la fin
const SDZ_ORDER = (() => {
  // Dofus placés : ceux qui ont un lien, et ceux qu'une quête exige (Dom de Pin, exigé par « Flovoraison »)
  const linked = SDZL.filter(d => d.a || d.q || d.pa || d.req), clo = Object.fromEntries(linked.map(d => [d.id, sdzClosure(d)]));
  const needs = Object.fromEntries(linked.map(d => [d.id, linked.filter(o => o !== d && ((o.a && clo[d.id].A.has(o.a)) || (o.q && clo[d.id].Q.has(o.q))
    || (!o.a && !o.q && (o.req || []).some(q => clo[d.id].Q.has(q))))).map(o => o.id)]));
  const key = d => { const l = SDZLV[d.id] || [999, 999]; return [l[1], l[0]]; };
  const placed = new Set(), out = [];
  while (out.length < linked.length) {
    let ready = linked.filter(d => !placed.has(d.id) && needs[d.id].every(x => placed.has(x)));
    if (!ready.length) ready = linked.filter(d => !placed.has(d.id));   // dépendance circulaire : on prend le plus bas niveau
    ready.sort((x, y) => { const a = key(x), b = key(y); return a[0] - b[0] || a[1] - b[1] || x.n.localeCompare(y.n, 'fr'); });
    placed.add(ready[0].id); out.push(ready[0]);
  }
  return [...out, ...SDZL.filter(d => !linked.includes(d))];
})();
// Carte d'un Dofus (vue Récompenses › Dofus) : un clic l'ouvre dans la fiche ; la case « objectif » et ✓ restent sur la carte
function dofusCard(d){
  const own = sdzOwned(d), goal = !own && sdzGoals.has(d.id), link = d.a || d.q || d.pa;
  const left = !own && link ? collectPrereqs('d', d.id) : null;
  const tip = `${d.n} — ${d.pa ? 'nécessite ' + sdzSrc(d) : d.pre ? 'lié à ' + sdzSrc(d) : link ? 'donné par ' + sdzSrc(d) : sdzNoLink(d)}${left && left.q.size ? ` · il reste ${left.q.size} quête(s)` : ''}`;
  return `<div class="dz ${own ? 'own' : 'miss'}${goal ? ' goal' : ''}${isPick('d', d.id) ? ' sel' : ''}" data-pick="d:${d.id}" tabindex="0" role="button" title="${esc(tip)}">
    <span class="dz-lv">${(() => { const l = SDZLV[d.id]; return l ? (l[0] === l[1] ? l[0] : `${l[0]} - ${l[1]}`) : ''; })()}</span>${!own && (!link || d.pre) ? `<button class="dz-hors" data-dzinfo="${d.id}" aria-label="Comment obtenir ${esc(d.n)}" title="${esc(dzWho(d))}">i</button>` : ''}
    <img src="${itemImg(d)}" alt="" loading="lazy" referrerpolicy="no-referrer">
    <div class="dz-n">${esc(d.n)}</div>
    <div class="dz-ctl">${own ? '<span class="dz-ok">✓ obtenu</span>' : `<label><input type="checkbox" data-sdzgoal="${d.id}" ${goal ? 'checked' : ''}> objectif</label>`}
      <button class="dz-tg" data-sdzown="${d.id}" title="${own ? 'Marquer comme non obtenu' : 'Marquer comme obtenu (avec la cascade de ses quêtes)'}">${own ? '↺' : '✓'}</button></div></div>`;
}
