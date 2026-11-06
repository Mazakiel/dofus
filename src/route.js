// Adresses de la page : la vue affichée ↔ un fragment d'URL lisible et partageable.
//   #/quetes                    vue Quêtes
//   #/quetes/40                 … catégorie 40  (tous · objectifs · autres pour les entrées particulières)
//   #/quetes/40/q219            … avec la quête 219 ouverte
//   #/succes/tous/a8855         vue Succès, « Tous les succès », succès 8855 ouvert
//   #/donjons/7/q12             vue Donjons, donjon 7, quête 12 ouverte
//   #/dofus   #/reglages
// Fonctions pures : la page lit et écrit ses variables, ce module ne connaît ni le DOM ni l'état.
// L'adresse ne contient aucune donnée personnelle : elle mène à la même vue chez n'importe qui.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Route = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VIEWS = ['succes', 'quetes', 'donjons', 'dofus', 'reglages'];
  const SPECIAL = ['tous', 'objectifs', 'autres'];
  const WITH_CATEGORY = ['succes', 'quetes'], WITH_ITEM = ['succes', 'quetes', 'donjons'];

  // { view, cat, dj, item: { k: 'q' | 'a', id } } → '#/…'
  function format(s) {
    if (!s || !VIEWS.includes(s.view)) return '#/quetes';
    const parts = [s.view];
    if (WITH_CATEGORY.includes(s.view) && s.cat != null) parts.push(String(s.cat));
    if (s.view === 'donjons' && s.dj != null) parts.push(String(s.dj));
    if (WITH_ITEM.includes(s.view) && s.item && (s.item.k === 'q' || s.item.k === 'a') && Number.isInteger(s.item.id)) parts.push(s.item.k + s.item.id);
    return '#/' + parts.join('/');
  }

  // '#/…' → { view, cat, dj, item } ; null si l'adresse n'est pas reconnue (la page garde alors sa vue)
  function parse(hash) {
    const m = String(hash || '').match(/^#\/(.+)$/); if (!m) return null;
    const parts = m[1].split('/'), view = parts.shift();
    if (!VIEWS.includes(view)) return null;
    const out = { view, cat: null, dj: null, item: null };
    const itemOf = p => { const x = /^([qa])(\d+)$/.exec(p || ''); return x ? { k: x[1], id: +x[2] } : null; };
    if (WITH_CATEGORY.includes(view)) {
      const c = parts.shift();
      if (c && (SPECIAL.includes(c) || /^\d+$/.test(c))) out.cat = c; else if (c) parts.unshift(c);
    } else if (view === 'donjons') {
      const d = parts.shift();
      if (d && /^\d+$/.test(d)) out.dj = +d; else if (d) parts.unshift(d);
    }
    if (WITH_ITEM.includes(view)) out.item = itemOf(parts[0]);
    return out;
  }
  // Partie de l'adresse sans la sélection : si elle ne change pas, on remplace l'entrée d'historique au lieu d'en ajouter
  const base = hash => String(hash || '').replace(/\/[qa]\d+$/, '');

  return { format, parse, base, VIEWS };
});
