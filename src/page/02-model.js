// ===== Modèle de la page : module de progression instancié, sauvegarde automatique, index des succès, état de vue (catégorie, cases d'affichage, mode).
// Règles de progression (src/progression.js) : possède l'état suivi, ses caches et la cascade. La page ne fait que l'interroger.
const P = Progression.create(SC);
P.load(PS.load());
// Sauvegarde automatique : toute modification de l'état déclenche l'écriture (groupée) ; plus aucun appel à penser après chaque changement.
function persistNow(){ if (PS.save(P.snapshot())) syncSoon(); }
let persistQueued = false;
P.subscribe(() => { if (persistQueued) return; persistQueued = true; queueMicrotask(() => { persistQueued = false; persistNow(); }); });
const { SACH, SDZ, QOWN, QNEXT, SPARENTS } = P.index;
const { sdone, sq, sodone, sdzGoals, qState } = P.state;   // états suivis : toute modification invalide les caches du module
const { achDone, objDone, achProg, collectPrereqs, collectDependents, lockReasons, reqLevel, questOngoing } = P;
const { questDone: qDoneS, questAvailable: qAvailNow, achAvailable: achAvailNow, questStatus: qStatus, dofusOwned: sdzOwned } = P;
const SCAT = Object.fromEntries(SC.categories.map(c => [c.id, c]));
const SBYCAT = {}; for (const a of SC.succes) (SBYCAT[a.c] = SBYCAT[a.c] || []).push(a);
for (const k in SBYCAT) SBYCAT[k].sort((a, b) => a.o - b.o || a.id - b.id);
const QOWN_PRE = {};  // quête → succès qui la demandent en objectif (calculé tôt, pour ranger les quêtes)
for (const o of Object.values(SC.objectifs)) if (o.t === 'q') (QOWN_PRE[o.r] = QOWN_PRE[o.r] || []).push(o.a);
const catPath = cid => { const c = SCAT[cid]; if (!c) return ''; const p = SCAT[c.p]; return p ? `${p.n} › ${c.n}` : c.n; };
const achImg = a => `https://api.dofusdb.fr/img/achievements/${a.ic}.png`;
let sCat = store.get('sCat', null);
let sMode = store.get('sMode', 'recomp');   // 'recomp' (Récompenses, la vue d'entrée) | 'succes' | 'quetes' | 'donjons'
// Filtres propres à chaque page : cases « Afficher les obtenus / les indisponibles / les saisonniers », recherche et filtre d'avancement.
// Pages : recomp, succes, quetes, donjons (la liste des donjons) et djq (les quêtes d'un donjon, sur la page Donjons). Les anciens réglages communs servent de départ.
const FILT_PAGES = ['recomp', 'succes', 'quetes', 'donjons', 'djq'];
const FILT0 = { done: store.get('sShowDone', !store.get('sHideDone', false)), locked: store.get('sShowLocked', false), seas: store.get('sSeasonal', false) };
const FILT = Object.fromEntries(FILT_PAGES.map(k => [k, { ...FILT0, search: '', prog: null }]));
for (const [k, f] of Object.entries(store.get('filters', {}))) if (FILT[k]) Object.assign(FILT[k], { done: !!f.done, locked: !!f.locked, seas: !!f.seas });
// Les variables ci-dessous sont celles de la page dont les filtres sont actifs (filtActive) : le reste du code les lit telles quelles.
let filtActive = sMode;
let sShowDone = FILT[sMode].done, sShowLocked = FILT[sMode].locked, sSeasonal = FILT[sMode].seas, sSearch = '';
function filtSave(){ const f = FILT[filtActive]; f.done = sShowDone; f.locked = sShowLocked; f.seas = sSeasonal; f.search = sSearch; f.prog = sProg; }
function filtUse(key){   // rend actifs les filtres d'une page ; vrai si la page a changé
  if (key === filtActive) return false;
  filtSave(); filtActive = key; const f = FILT[key];
  sShowDone = f.done; sShowLocked = f.locked; sSeasonal = f.seas; sSearch = f.search; sProg = f.prog;
  return true;
}
const filtPersist = () => { filtSave(); store.set('filters', Object.fromEntries(FILT_PAGES.map(k => [k, { done: FILT[k].done, locked: FILT[k].locked, seas: FILT[k].seas }]))); };
function withFilt(key, fn){ const prev = filtActive; filtUse(key); try { return fn(); } finally { filtUse(prev); } }   // exécute fn avec les filtres d'une autre page
function setFilt(key, patch){ withFilt(key, () => { if ('done' in patch) sShowDone = patch.done; if ('locked' in patch) sShowLocked = patch.locked; if ('seas' in patch) sSeasonal = patch.seas; if ('search' in patch) sSearch = patch.search; if ('prog' in patch) sProg = patch.prog; filtPersist(); }); }
const filtOff = f => !f.done || f.locked || f.seas;   // un filtre s'écarte du réglage par défaut
// Ce qui est suivi n'est plus décidé ici : le build (scripts/lib/tracked-content.js) marque les succès suivis (`t`), le contenu
// saisonnier (`s`) et fournit les entrées du menu. Les sous-catégories de Quêtes (sauf « Général ») puis Événements, regroupé en une seule entrée.
const MENU_BY_ID = Object.fromEntries((SC.menu || []).map(m => [m.id, m]));
const CAT_GROUP = {}; for (const m of SC.menu || []) for (const c of m.cats) CAT_GROUP[c] = m.id;   // catégorie → entrée du menu qui l'affiche
const catAllowed = cid => cid in CAT_GROUP;
const catIds = id => (MENU_BY_ID[id] || { cats: [id] }).cats;
const groupOf = cid => (cid in CAT_GROUP ? CAT_GROUP[cid] : cid);   // une catégorie non suivie reste elle-même
const sVisible = a => !!a.t && (sSeasonal || !(SCAT[a.c] || {}).s);   // succès de quêtes suivis ; les saisonniers seulement si on les affiche
function catStats(cid){
  if (cid === SALL) { const all = SC.succes.filter(sVisible); return { n: all.length, d: all.filter(a => achDone(a.id)).length }; }
  const ids = catIds(cid);
  const list = ids.flatMap(id => SBYCAT[id] || []).filter(sVisible);
  const d = list.filter(a => achDone(a.id));
  return { n: list.length, d: d.length };
}
const qName = qid => (SC.quetes[qid] && SC.quetes[qid].n) || `quête ${qid}`;
