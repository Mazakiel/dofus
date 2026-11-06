// ===== Synchronisation entre appareils : connexion Google et Firestore (adapter du module ProgressStore).
// ---- Synchronisation entre appareils (Firebase : connexion Google + Firestore) ----
// Les coches restent d'abord dans le navigateur ; la synchro est un plus et la page marche sans elle.
// La décision (envoyer, recevoir, fusionner) est dans src/progress-store.js ; la page fournit seulement l'adapter Firestore.
// Un document par utilisateur : users/{uid} = { profiles: { <id>: payload } }.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDKocCOiSELHAmqLldebqBoYtJIwOrjO6c", authDomain: "dofus-fc9d3.firebaseapp.com", projectId: "dofus-fc9d3",
  storageBucket: "dofus-fc9d3.firebasestorage.app", messagingSenderId: "983982346718", appId: "1:983982346718:web:0020d7637b4e22ca5e0d4f"
};   // clé publique par conception : l'accès est protégé par les règles Firestore (firestore.rules) et les domaines autorisés
const FB_URL = n => `https://www.gstatic.com/firebasejs/13.2.0/firebase-${n}.js`;
var fb = null, fbLoading = null, syncBusy = false, syncAgain = false, syncTimer = null, syncMsg = '', syncLast = null, syncSeen = 0;
function fbLoad(){
  if (fbLoading) return fbLoading;
  fbLoading = (async () => {
    const [app, au, fs] = await Promise.all([import(FB_URL('app')), import(FB_URL('auth')), import(FB_URL('firestore'))]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = { au, fs, auth: au.getAuth(a), db: fs.getFirestore(a), user: null };
    au.onAuthStateChanged(fb.auth, u => { fb.user = u; renderSync(); if (u) syncNow(false); });
    return fb;
  })().catch(e => { fbLoading = null; syncMsg = 'Impossible de charger la synchronisation (connexion ?)'; renderSync(); throw e; });
  return fbLoading;
}
function syncSoon(){ if (!fb || !fb.user) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(false), 2500); }
const syncErr = e => {
  const c = (e && e.code) || '';
  if (c === 'permission-denied') return 'Accès refusé : les règles Firestore ne sont pas en place';
  if (c === 'auth/unauthorized-domain') return 'Domaine non autorisé dans Firebase (Authentication › Paramètres)';
  if (c === 'auth/operation-not-allowed') return 'Connexion Google non activée dans Firebase';
  if (c === 'auth/popup-blocked') return 'Fenêtre de connexion bloquée par le navigateur : réessaie';
  if (c === 'unavailable' || !navigator.onLine) return 'Hors ligne : la synchro reprendra dès que possible';
  return 'Erreur de synchro : ' + ((e && e.message) || c || 'inconnue');
};
async function syncNow(manual){
  if (!fb || !fb.user) return;
  if (syncBusy) { syncAgain = true; return; }
  syncBusy = true; syncMsg = 'Synchronisation…'; renderSync();
  let refresh = false;
  try {
    const ref = fb.fs.doc(fb.db, 'users', fb.user.uid);
    const remote = {   // adapter Firestore
      read: async () => { const snap = await fb.fs.getDoc(ref); return (snap.exists() && snap.data().profiles) || {}; },
      write: profiles => fb.fs.setDoc(ref, { profiles, updatedAt: fb.fs.serverTimestamp() }, { merge: true }),
    };
    const r = await ProgressStore.sync(PS, remote, { manual, confirmMerge: name => askConfirm(`Le profil « ${name} » a changé sur cet appareil et dans le cloud. Fusionner ? Les coches des deux côtés sont gardées (une coche retirée d’un côté peut revenir).`, 'Fusionner', 'Plus tard') });
    refresh = r.refresh; syncLast = new Date(); syncMsg = r.conflicts ? 'Conflit : appuie sur « Synchroniser » pour fusionner' : '';
  } catch (e) { syncMsg = syncErr(e); }
  syncBusy = false;
  if (refresh) { P.load(PS.load()); renderProfiles(); renderSucces(); }   // le profil actif a pu changer : on recharge l'état en mémoire
  renderSync();
  if (syncAgain) { syncAgain = false; syncNow(false); }
}
async function syncDelete(id){
  if (!fb || !fb.user) return;
  try { await fb.fs.updateDoc(fb.fs.doc(fb.db, 'users', fb.user.uid), { ['profiles.' + id]: fb.fs.deleteField() }); } catch (e) { syncMsg = syncErr(e); renderSync(); }
}
function renderSync(){
  const t = syncLast ? syncLast.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const out = fb && fb.user
    ? `<div><b>Synchronisation</b><small>${esc(fb.user.email || 'Connecté')} · ${esc(syncMsg || (t ? 'à jour à ' + t : 'connecté'))}</small></div>
       <div class="plus-btns"><button class="btn" data-sync="now">Synchroniser</button><button class="btn" data-sync="logout">Se déconnecter</button></div>`
    : `<div><b>Synchronisation</b><small>${esc(syncMsg || 'Retrouve tes coches sur tous tes appareils')}</small></div>
       <button class="btn primary" data-sync="login">Se connecter avec Google</button>`;
  for (const id of ['syncPlus', 'syncDlg']) { const el = document.getElementById(id); if (el) el.innerHTML = out; }
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-sync]'); if (!b) return;
  const act = b.dataset.sync;
  try {
    if (act === 'login') {
      await fbLoad();   // normalement déjà préchargé : la fenêtre de connexion doit s'ouvrir dans le geste de l'utilisateur
      await fb.au.signInWithPopup(fb.auth, new fb.au.GoogleAuthProvider());
      store.set('sync:on', true); await syncNow(true);
    } else if (act === 'now') { await syncNow(true); }
    else if (act === 'logout') { await fb.au.signOut(fb.auth); store.set('sync:on', false); syncMsg = ''; syncLast = null; renderSync(); }
  } catch (err) { if (err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') { syncMsg = syncErr(err); renderSync(); } }
});
// préchargement du SDK dès qu'on voit le bouton (sinon le navigateur peut bloquer la fenêtre de connexion), puis reprises automatiques
const preloadSync = () => { fbLoad().catch(() => {}); };
document.getElementById('profBtn').addEventListener('click', preloadSync);
document.getElementById('mProf').addEventListener('click', preloadSync);
document.getElementById('tabbar').addEventListener('click', e => { if (e.target.closest('[data-tab="plus"]')) preloadSync(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && fb && fb.user && Date.now() - syncSeen > 30000) { syncSeen = Date.now(); syncNow(false); } });
window.addEventListener('online', () => syncNow(false));
renderSync();
if (store.get('sync:on', false)) preloadSync();   // déjà connecté : on reprend la session et on récupère les changements

