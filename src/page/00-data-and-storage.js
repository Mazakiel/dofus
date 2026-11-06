// ===== Données DofusDB embarquées et stockage du navigateur (adapter du module ProgressStore).
// Les fichiers de src/page/ forment un seul script, assemblé dans l'ordre de leur nom (scripts/build.js) : ils partagent la même portée.
const DOFUSDB = /*__DATA__*/null;   // données DofusDB uniquement (catégories, succès, objectifs, quêtes, donjons, Dofus)
// Stockage du navigateur : adapter du module ProgressStore (src/progress-store.js), qui possède les profils et les clés.
// localStorage (lecture immédiate) + copie miroir dans IndexedDB (mêmes clés, sans le préfixe).
// Noms historiques, à ne pas changer : ils portent des données déjà enregistrées (l'application a commencé comme un suivi du niveau 200).
const STORAGE_PREFIX = 'c200:', IDB_NAME = 'contenu200';
const TRACK_RE = /(^|:)(sdone|sq|sodone)$/;
const idb = {
  open(){ return new Promise((res, rej) => { try { const r = indexedDB.open(IDB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch(e){ rej(e); } }); },
  async put(k, v){ try { const db = await this.open(); db.transaction('kv','readwrite').objectStore('kv').put(v, k); } catch(e){} },
  async del(k){ try { const db = await this.open(); db.transaction('kv','readwrite').objectStore('kv').delete(k); } catch(e){} },
  async all(){ try { const db = await this.open(); return await new Promise(res => { const out = {}; const st = db.transaction('kv').objectStore('kv'); const c = st.openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; c.onerror = () => res(out); }); } catch(e){ return {}; } }
};
const browserStorage = {
  get(k, d){ try{ const v = localStorage.getItem(STORAGE_PREFIX + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v)); }catch(e){} idb.put(k, v); },
  del(k){ try{ localStorage.removeItem(STORAGE_PREFIX + k); }catch(e){} idb.del(k); }
};
const PS = ProgressStore.create(browserStorage);
// préférences d'affichage (thème, cases, catégorie…), communes à tous les profils
const store = { get: (k, d) => PS.pref(k, d), set: (k, v) => PS.setPref(k, v) };
// Restauration depuis IndexedDB si le localStorage a perdu toutes les coches ; sinon on complète le miroir.
(async () => {
  const lsKeys = () => { try { return Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX)); } catch(e){ return []; } };
  const nonEmpty = v => Array.isArray(v) && v.length > 0;
  const saved = await idb.all();
  const savedHas = Object.keys(saved).some(k => TRACK_RE.test(k) && nonEmpty(saved[k]));
  const lsHas = lsKeys().some(k => { if (!TRACK_RE.test(k)) return false; try { return nonEmpty(JSON.parse(localStorage.getItem(k))); } catch(e){ return false; } });
  if (!lsHas && savedHas) {
    let ok = false;
    try {
      if (!('profiles' in saved)) { localStorage.removeItem(STORAGE_PREFIX + 'profiles'); localStorage.removeItem(STORAGE_PREFIX + 'profile'); }   // anciennes données seules : la migration refera « Défaut »
      for (const [k, v] of Object.entries(saved)) localStorage.setItem(STORAGE_PREFIX + k, JSON.stringify(v));
      ok = lsKeys().some(k => TRACK_RE.test(k));
    } catch(e){}
    if (ok) { location.reload(); return; }
    const g = k => saved['p:' + PS.current() + ':' + k] || saved[k] || [];
    P.load({ ...P.snapshot(), sdone: g('sdone'), sq: g('sq'), sodone: g('sodone') }); renderSucces();   // localStorage bloqué : on travaille depuis IndexedDB
  } else {
    for (const k of lsKeys()) { const s = k.slice(STORAGE_PREFIX.length); if (!(s in saved)) { try { idb.put(s, JSON.parse(localStorage.getItem(k))); } catch(e){} } }
  }
})();
