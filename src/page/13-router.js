// ===== Navigation : bouton retour et liens partageables (adresses écrites et lues par src/route.js).
// Règles d'historique :
//   - changer de vue, de catégorie ou de donjon ajoute une entrée : « retour » revient à la vue d'avant ;
//   - sur téléphone, ouvrir la fiche (feuille) ajoute une entrée : « retour » ferme la feuille au lieu de quitter la page ;
//   - choisir une ligne sur ordinateur remplace l'entrée courante (pas d'historique pour chaque clic).
// L'adresse ne garde la sélection que si elle est visible (fiche à droite sur ordinateur, feuille ouverte sur téléphone).
var routing = { ready: false, applying: false, sheetPushed: false };   // `var` : routeSync() est appelée par le premier rendu, avant ce fichier
const VIEW_NAMES = { succes: 'Succès', quetes: 'Quêtes', donjons: 'Donjons', recomp: 'Récompenses', plus: 'Réglages' };
const KIND_TOKEN = { d: 'dofus', t: 'titres', o: 'ornements' }, TOKEN_KIND = { dofus: 'd', titres: 't', ornements: 'o' };
const catToken = c => (c === QALL || c === SALL) ? 'tous' : c === QGOAL ? 'objectifs' : c === QOTHER ? 'autres' : c;
const sheetOpen = () => document.body.classList.contains('sheet-open');

function routeState() {
  const view = mTab === 'plus' ? 'reglages' : mTab === 'recomp' ? 'recompenses' : mTab, st = { view, cat: null, dj: null, item: null };
  if (view === 'recompenses') { st.cat = KIND_TOKEN[rKind]; if (sPick && ['d', 't', 'o'].includes(sPick.k) && (!isMobile() || sheetOpen())) st.item = { k: sPick.k, id: sPick.id }; return st; }
  if (view === 'succes' || view === 'quetes') st.cat = sCat == null ? null : String(catToken(sCat));
  if (view === 'donjons') st.dj = sDj;
  if (['succes', 'quetes', 'donjons'].includes(view) && sPick && (!isMobile() || sheetOpen())) st.item = { k: sPick.k, id: sPick.id };
  return st;
}
function applyTitle() { document.title = `${VIEW_NAMES[mTab] || 'Progression'} · Progression Dofus`; }

// À appeler après toute navigation : met l'adresse et l'historique en accord avec la vue affichée
function routeSync() {
  if (!routing || !routing.ready || routing.applying) return;
  const next = Route.format(routeState()), cur = location.hash;
  if (next === cur) return;
  const sheet = isMobile() && sheetOpen(), onSheetEntry = !!(history.state && history.state.sheet);
  if (Route.base(next) === Route.base(cur)) {                         // seule la sélection change
    if (sheet && !onSheetEntry) { history.pushState({ sheet: true }, '', next); routing.sheetPushed = true; }
    else history.replaceState(sheet ? { sheet: true } : {}, '', next);
  } else if (onSheetEntry) { history.replaceState({}, '', next); routing.sheetPushed = false; }   // on quitte la feuille en changeant de vue : pas d'entrée en plus
  else history.pushState({}, '', next);
  applyTitle();
}

// Applique une adresse à la page (chargement, bouton retour, lien collé). Rend false si elle n'est pas reconnue.
function applyRoute(hash) {
  const s = Route.parse(hash); if (!s) return false;
  routing.applying = true;
  try {
    sPick = null;
    if (s.view === 'recompenses') {
      mTab = 'recomp'; sMode = 'recomp'; store.set('sMode', sMode);
      if (s.cat && TOKEN_KIND[s.cat] && TOKEN_KIND[s.cat] !== rKind) { rKind = TOKEN_KIND[s.cat]; store.set('rKind', rKind); rCat = SALL; store.set('rCat', rCat); }
    } else if (s.view === 'reglages') mTab = 'plus'; else { mTab = s.view; sMode = s.view; store.set('sMode', sMode); }
    store.set('mTab', mTab);
    if (s.cat != null && (s.view === 'succes' || s.view === 'quetes')) {
      sCat = s.cat === 'tous' ? (s.view === 'quetes' ? QALL : SALL) : s.cat === 'objectifs' ? QGOAL : s.cat === 'autres' ? QOTHER : +s.cat;
      store.set('sCat', sCat);
    }
    if (s.dj != null) { sDj = s.dj; store.set('sDj', sDj); }
    if (s.item && (s.item.k === 'q' ? SC.quetes[s.item.id] : s.item.k === 'a' ? SACH[s.item.id] : rwOf(s.item.k, s.item.id))) sPick = { k: s.item.k, id: s.item.id };
    if (sPick && isMobile()) openSheet(); else closeSheet();
    renderSucces();
    applyTitle();
  } finally { routing.applying = false; }
  return true;
}

// Fermeture voulue de la feuille (✕, fond, Échap) : si elle a ajouté une entrée d'historique, on la retire en revenant en arrière
function dismissSheet() {
  if (routing.sheetPushed && history.state && history.state.sheet) { history.back(); return; }   // popstate refermera la feuille
  closeSheet(); renderScList(); routeSync();
}

window.addEventListener('popstate', () => { applyRoute(location.hash); routing.sheetPushed = !!(history.state && history.state.sheet); });

(function routerInit() {
  routing.ready = true;
  applyRoute(location.hash);   // lien collé ou rechargement : la vue de l'adresse prime sur la dernière vue mémorisée
  history.replaceState(isMobile() && sheetOpen() ? { sheet: true } : {}, '', Route.format(routeState()));
  applyTitle();
})();
