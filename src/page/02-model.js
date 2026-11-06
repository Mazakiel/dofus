// ===== Modèle de la page : module de progression instancié, sauvegarde automatique, index des succès, état de vue (catégorie, cases d'affichage, mode).
// Règles de progression (src/progression.js) : possède l'état suivi, ses caches et la cascade. La page ne fait que l'interroger.
const P = Progression.create(SC);
P.load(PS.load());
// Sauvegarde automatique : toute modification de l'état déclenche l'écriture (groupée) ; plus aucun appel à penser après chaque changement.
function persistNow(){ if (PS.save(P.snapshot())) syncSoon(); }
let persistQueued = false;
P.subscribe(() => { if (persistQueued) return; persistQueued = true; queueMicrotask(() => { persistQueued = false; persistNow(); }); });
const { SACH, SDZ, QOWN, QNEXT, SPARENTS } = P.index;
const { sdone, sq, sodone, sdzState, sdzGoals, qState } = P.state;   // états suivis : toute modification invalide les caches du module
const { achDone, objDone, achProg, collectPrereqs, collectDependents, lockReasons } = P;
const { questDone: qDoneS, questAvailable: qAvailNow, achAvailable: achAvailNow, questStatus: qStatus, dofusAuto: sdzAuto, dofusOwned: sdzOwned } = P;
const SCAT = Object.fromEntries(SC.categories.map(c => [c.id, c]));
const SBYCAT = {}; for (const a of SC.succes) (SBYCAT[a.c] = SBYCAT[a.c] || []).push(a);
for (const k in SBYCAT) SBYCAT[k].sort((a, b) => a.o - b.o || a.id - b.id);
const QOWN_PRE = {};  // quête → succès qui la demandent en objectif (calculé tôt, pour ranger les quêtes)
for (const o of Object.values(SC.objectifs)) if (o.t === 'q') (QOWN_PRE[o.r] = QOWN_PRE[o.r] || []).push(o.a);
const catPath = cid => { const c = SCAT[cid]; if (!c) return ''; const p = SCAT[c.p]; return p ? `${p.n} › ${c.n}` : c.n; };
const achImg = a => `https://api.dofusdb.fr/img/achievements/${a.ic}.png`;
let sCat = store.get('sCat', null);
// « Afficher les obtenus » (ancien « Masquer les obtenus », repris dans l'autre sens) et « Afficher les indisponibles »
let sShowDone = store.get('sShowDone', !store.get('sHideDone', false)), sShowLocked = store.get('sShowLocked', false);
let sSearch = '';
let sMode = store.get('sMode', 'succes');   // 'succes' | 'quetes'
// Ce qui est suivi n'est plus décidé ici : le build (scripts/lib/tracked-content.js) marque les succès suivis (`t`), le contenu
// saisonnier (`s`) et fournit les entrées du menu. Les sous-catégories de Quêtes (sauf « Général ») puis Événements, regroupé en une seule entrée.
const MENU_BY_ID = Object.fromEntries((SC.menu || []).map(m => [m.id, m]));
const CAT_GROUP = {}; for (const m of SC.menu || []) for (const c of m.cats) CAT_GROUP[c] = m.id;   // catégorie → entrée du menu qui l'affiche
const catAllowed = cid => cid in CAT_GROUP;
const catIds = id => (MENU_BY_ID[id] || { cats: [id] }).cats;
const groupOf = cid => (cid in CAT_GROUP ? CAT_GROUP[cid] : cid);   // une catégorie non suivie reste elle-même
let sSeasonal = store.get("sSeasonal", false);
const sVisible = a => !!a.t && (sSeasonal || !(SCAT[a.c] || {}).s);   // succès de quêtes suivis ; les saisonniers seulement si on les affiche
function catStats(cid){
  if (cid === SALL) { const all = SC.succes.filter(sVisible); return { n: all.length, d: all.filter(a => achDone(a.id)).length }; }
  const ids = catIds(cid);
  const list = ids.flatMap(id => SBYCAT[id] || []).filter(sVisible);
  const d = list.filter(a => achDone(a.id));
  return { n: list.length, d: d.length };
}
const qName = qid => (SC.quetes[qid] && SC.quetes[qid].n) || `quête ${qid}`;
