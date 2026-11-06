// Ce que l'application suit, défini une seule fois.
//
// Prend les données DofusDB complètes et rend les données allégées que la page embarque, avec la règle déjà appliquée :
//   - succès `t` : succès de quêtes suivis (catégories Quêtes hors « Général », et Événements, qui ont un lien avec les quêtes) ;
//   - `s` : contenu saisonnier (catégories, quêtes, Dofus), que la page masque sauf si on l'affiche ;
//   - `menu` : les entrées du menu de gauche, dans l'ordre, avec les catégories de chacune (Événements regroupe les siennes).
// La page lit ces drapeaux : elle ne connaît plus ni les identifiants de catégories ni la règle.
const QUETES = 8, EVENTS = 9, QGEN = 118, GEN = 15;     // catégories de succès : Quêtes, Événements, « Général » de Quêtes, « Général » racine
const SEASONAL = new Set([60, 23, 89, 68]);              // Archipel de Vulkania, Île de Nowel, Île de Pwâk (Pâques), Halouine
const DOFUS_SEASONAL_SANS_LIEN = new Set([20833]);       // Dofus Cacao : événement de l'île de Pwâk, sans succès rattaché

function trackedContent(D) {
  // ---- 1. élagage : on garde les succès suivis et ceux qu'ils référencent ----
  const cat = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const top = id => { let c = cat[id]; while (c && c.p && cat[c.p]) c = cat[c.p]; return c ? c.id : null; };
  const ach = Object.fromEntries(D.succes.map(a => [a.id, a]));
  const keep = new Set();
  const add = id => { if (keep.has(id) || !ach[id]) return; keep.add(id); for (const oid of ach[id].ob) { const o = D.objectifs[oid]; if (o && o.t === 'a') add(o.r); } };
  for (const a of D.succes) { const t = top(a.c); if (a.c !== QGEN && a.c !== GEN && (t === QUETES || t === EVENTS)) add(a.id); }
  for (const q of Object.values(D.quetes)) (q.preA || []).forEach(add);                    // succès exigés par une quête
  for (const d of D.dofus || []) { if (d.a) add(d.a); (d.pa || []).forEach(add); }          // succès liés à un Dofus
  const succes = D.succes.filter(a => keep.has(a.id));
  const catK = new Set(); for (const a of succes) { let c = cat[a.c]; while (c) { catK.add(c.id); c = cat[c.p]; } }
  const objectifs = {}; for (const a of succes) for (const oid of a.ob) if (D.objectifs[oid]) objectifs[oid] = D.objectifs[oid];
  const categories = D.categories.filter(c => catK.has(c.id));

  // ---- 2. qualification : la règle, appliquée une fois ----
  const lcat = Object.fromEntries(categories.map(c => [c.id, c]));
  const ltop = id => { let c = lcat[id]; while (c && c.p && lcat[c.p]) c = lcat[c.p]; return c ? c.id : null; };
  const allowed = cid => { const t = ltop(cid); return cid !== QGEN && cid !== GEN && (t === QUETES || t === EVENTS); };
  // succès liés aux quêtes : catégorie Quêtes, au moins une quête en objectif, ou un sous-succès lié aux quêtes
  const rel = new Set();
  for (const a of succes) if (ltop(a.c) === QUETES || a.ob.some(oid => objectifs[oid] && objectifs[oid].t === 'q')) rel.add(a.id);
  for (let changed = true; changed;) { changed = false;
    for (const a of succes) if (!rel.has(a.id) && a.ob.some(oid => { const o = objectifs[oid]; return o && o.t === 'a' && rel.has(o.r); })) { rel.add(a.id); changed = true; } }
  const byId = Object.fromEntries(succes.map(a => [a.id, a]));
  const owners = {};   // quête → succès qui la demandent en objectif
  for (const o of Object.values(objectifs)) if (o.t === 'q') (owners[o.r] = owners[o.r] || []).push(o.a);
  const seasonalAch = id => byId[id] && SEASONAL.has(byId[id].c);

  const children = id => categories.filter(c => c.p === id).sort((a, b) => a.o - b.o);
  const menu = [...children(QUETES).filter(c => allowed(c.id)).map(c => ({ id: c.id, n: c.n, cats: [c.id] })),
    { id: EVENTS, n: (lcat[EVENTS] || {}).n || 'Événements', cats: [EVENTS, ...children(EVENTS).map(c => c.id)] }];

  const quetes = {};
  for (const [id, q] of Object.entries(D.quetes)) {
    const own = (owners[id] || []).map(a => byId[a]).filter(Boolean);
    const seasonal = own.length ? own.every(a => SEASONAL.has(a.c)) : !!q.ev;
    quetes[id] = seasonal ? { ...q, s: 1 } : q;
  }
  const dofus = (D.dofus || []).map(d => {
    const seasonal = DOFUS_SEASONAL_SANS_LIEN.has(d.id) || [d.a, ...(d.pa || []), ...(d.q ? (owners[d.q] || []) : [])].some(a => a && seasonalAch(a));
    return seasonal ? { ...d, s: 1 } : d;
  });
  return {
    ...D, menu, quetes, dofus, objectifs,
    categories: categories.map(c => SEASONAL.has(c.id) ? { ...c, s: 1 } : c),
    succes: succes.map(a => (allowed(a.c) && rel.has(a.id) ? { ...a, t: 1 } : a)),
  };
}

module.exports = { trackedContent, QUETES, EVENTS, QGEN, GEN, SEASONAL };
