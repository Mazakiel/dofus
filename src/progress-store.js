// Progression persistée : profils, sauvegarde par profil, sérialisation (synchro, export, import) et synchro entre appareils.
//
// Le module possède la liste des clés qui forment la progression d'un profil : la page, la synchro et l'export n'en
// tiennent plus chacun leur copie. Il parle à deux adapters :
//   - un stockage { get(clé, défaut), set(clé, valeur), del(clé) } : le navigateur (localStorage + copie IndexedDB) ou une mémoire en test ;
//   - un distant { read() → { <profil>: payload }, write({ <profil>: payload }) } : Firestore, ou un faux en test.
// Il ne connaît ni le DOM, ni Firebase, ni l'état en mémoire (src/progression.js) : il échange des « snapshots »
// (la forme que `snapshot()` / `load()` de la progression utilisent).
//
// Disposition historique du stockage, à ne pas changer : p:<profil>:<clé> pour la progression, `profiles` et `profile`
// pour la liste et le profil actif, et les autres clés pour les préférences d'affichage.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProgressStore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Les clés d'une progression : celles de `snapshot()` dans src/progression.js
  // Réglages qui suivent l'utilisateur d'un appareil à l'autre (le dernier modifié l'emporte) : gestes de glissement sur les lignes.
  // Ils voyagent dans le même document que les profils, sous une clé réservée : aucune règle Firestore à changer.
  const SYNCED_PREFS = ['swipeR', 'swipeL'], PREFS_KEY = '__prefs';
  const KEYS = ['sdone', 'sq', 'sodone', 'sLevel', 'sdzState', 'sdzGoals', 'rwGoals', 'qState'];
  const defaults = () => ({ sdone: [], sq: [], sodone: [], sLevel: 200, sdzState: {}, sdzGoals: [], rwGoals: [], qState: {} });
  const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const union = (x, y) => [...new Set([...(x || []), ...(y || [])])];

  // ---- payload : la progression d'un profil sous la forme envoyée au distant ----
  // (sdzState et qState sont des chaînes JSON : le distant fusionne les objets en profondeur, ce qui perdrait les suppressions)
  const toPayload = (name, snap, savedAt) => ({
    n: name, sdone: snap.sdone, sq: snap.sq, sodone: snap.sodone, sLevel: snap.sLevel,
    sdzState: JSON.stringify(snap.sdzState), sdzGoals: snap.sdzGoals, rwGoals: snap.rwGoals, qState: JSON.stringify(snap.qState), savedAt: savedAt || '',
  });
  const fromPayload = pl => ({
    sdone: pl.sdone || [], sq: pl.sq || [], sodone: pl.sodone || [], sLevel: pl.sLevel || 200,
    sdzState: JSON.parse(pl.sdzState || '{}'), sdzGoals: pl.sdzGoals || [], rwGoals: pl.rwGoals || [], qState: JSON.parse(pl.qState || '{}'),
  });
  const samePayload = (a, b) => {
    const srt = x => [...(x || [])].sort();
    const k = pl => JSON.stringify([pl.n, srt(pl.sdone), srt(pl.sq), srt(pl.sodone), pl.sLevel, srt(pl.sdzGoals), srt(pl.rwGoals), pl.sdzState, pl.qState || '{}']);
    return k(a) === k(b);
  };
  // Fusion : union des coches des deux côtés (une coche retirée d'un côté peut revenir) ; le local l'emporte pour les états
  const mergePayloads = (a, b, savedAt) => ({
    n: a.n, sdone: union(a.sdone, b.sdone), sq: union(a.sq, b.sq), sodone: union(a.sodone, b.sodone), sdzGoals: union(a.sdzGoals, b.sdzGoals), rwGoals: union(a.rwGoals, b.rwGoals),
    sLevel: Math.max(a.sLevel || 1, b.sLevel || 1),
    sdzState: JSON.stringify({ ...JSON.parse(b.sdzState || '{}'), ...JSON.parse(a.sdzState || '{}') }),
    qState: JSON.stringify({ ...JSON.parse(b.qState || '{}'), ...JSON.parse(a.qState || '{}') }),
    savedAt: savedAt || new Date().toISOString(),
  });

  // ---- export / import des coches (format de fichier historique, à conserver : des exports existent) ----
  const EXPORT_FORMAT = 'succes-dofus-coches';
  function exportFile(snap, profileName, when) {
    return { format: EXPORT_FORMAT, version: 2, exporteLe: when || new Date().toISOString(), profil: profileName, niveau: snap.sLevel,
      succesObtenus: snap.sdone, succesQuetes: snap.sq, succesObjectifs: snap.sodone, succesDofusEtat: snap.sdzState,
      succesDofusObjectifs: snap.sdzGoals, succesRecompensesObjectifs: snap.rwGoals, succesQuetesEtat: snap.qState };
  }
  // Ce que contient un fichier d'import, pour demander confirmation : { count, hasDofus, profil } ; count = 0 et sans Dofus : fichier non reconnu
  function inspectImport(file) {
    const count = ['succesObtenus', 'succesQuetes', 'succesObjectifs'].reduce((s, k) => s + (Array.isArray(file[k]) ? file[k].length : 0), 0);
    return { count, hasDofus: !!file.succesDofusEtat, profil: file.profil || null };
  }
  // Ajoute le contenu du fichier à `snap` (sans rien retirer). `known` écarte ce que les données ne connaissent pas :
  // { dofus(id) → bool, quest(id) → bool, reward(clé) → bool }
  function importInto(snap, file, known) {
    const out = { ...snap, sdone: [...snap.sdone], sq: [...snap.sq], sodone: [...snap.sodone], sdzGoals: [...snap.sdzGoals], rwGoals: [...(snap.rwGoals || [])], sdzState: { ...snap.sdzState }, qState: { ...snap.qState } };
    for (const [from, to] of [['succesObtenus', 'sdone'], ['succesQuetes', 'sq'], ['succesObjectifs', 'sodone']]) if (Array.isArray(file[from])) out[to] = union(out[to], file[from].map(Number));
    if (file.succesDofusEtat && typeof file.succesDofusEtat === 'object') for (const [k, v] of Object.entries(file.succesDofusEtat)) if (known.dofus(k) && (v === 'owned' || v === 'missing')) out.sdzState[k] = v;
    if (Array.isArray(file.succesDofusObjectifs)) out.sdzGoals = union(out.sdzGoals, file.succesDofusObjectifs.filter(id => known.dofus(id)).map(Number));
    if (Array.isArray(file.succesRecompensesObjectifs)) out.rwGoals = union(out.rwGoals, file.succesRecompensesObjectifs.filter(k => (known.reward || (() => true))(k)));
    if (file.succesQuetesEtat && typeof file.succesQuetesEtat === 'object') for (const [k, v] of Object.entries(file.succesQuetesEtat)) if (known.quest(k) && (v === 's' || v === 'b')) out.qState[k] = v;
    return out;
  }

  function create(adapter, options) {
    const now = (options && options.now) || (() => new Date().toISOString());
    const key = (id, k) => `p:${id}:${k}`;

    // Premier chargement : profil « Défaut », qui reprend les anciennes clés sans profil (les anciennes clés restent en secours)
    let profiles = adapter.get('profiles', null);
    if (!Array.isArray(profiles) || !profiles.length) {
      profiles = [{ id: 'default', n: 'Défaut' }];
      for (const k of [...KEYS, 'savedAt']) { const v = adapter.get(k, undefined); if (v !== undefined && adapter.get(key('default', k), undefined) === undefined) adapter.set(key('default', k), v); }
      adapter.set('profiles', profiles); adapter.set('profile', 'default');
    }
    let current = adapter.get('profile', profiles[0].id);
    if (!profiles.some(p => p.id === current)) current = profiles[0].id;
    const writeProfiles = () => adapter.set('profiles', profiles);
    const find = id => profiles.find(p => p.id === id);
    const savedAt = id => adapter.get(key(id, 'savedAt'), '') || '';

    const self = {
      // ---- profils ----
      profiles: () => profiles.map(p => ({ ...p })),
      has: id => !!find(id),
      current: () => current,
      name: id => (find(id) || {}).n || id,
      switchTo(id) { if (find(id)) { current = id; adapter.set('profile', id); } },
      add(name) {
        let id;   // l'heure seule ne suffit pas : deux profils créés dans la même milliseconde auraient le même identifiant
        do { id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4); } while (find(id));
        profiles.push({ id, n: name }); writeProfiles(); return id;
      },
      rename(id, name) { const p = find(id); if (p && name) { p.n = name; writeProfiles(); } },
      remove(id) {
        if (profiles.length < 2 || !find(id)) return false;
        for (const k of [...KEYS, 'savedAt', 'syncBase']) adapter.del(key(id, k));
        profiles = profiles.filter(p => p.id !== id); writeProfiles();
        if (current === id) { current = profiles[0].id; adapter.set('profile', current); }
        return true;
      },
      // ---- progression d'un profil ----
      load(id = current) { const d = defaults(), snap = {}; for (const k of KEYS) snap[k] = adapter.get(key(id, k), d[k]); return snap; },
      // Écrit ce qui a changé ; la date de dernière modification ne bouge que si quelque chose a vraiment changé. Retourne true si oui.
      save(snap, id = current) {
        const d = defaults(); let changed = false;
        for (const k of KEYS) if (!sameJson(snap[k], adapter.get(key(id, k), d[k]))) { adapter.set(key(id, k), snap[k]); changed = true; }
        if (changed) adapter.set(key(id, 'savedAt'), now());
        return changed;
      },
      summary(id) { const s = self.load(id); return { level: s.sLevel, quests: s.sq.length, achievements: s.sdone.length }; },
      // ---- préférences d'affichage (communes à tous les profils) ----
      pref: (k, d) => adapter.get(k, d),
      syncedPrefs() { const v = {}; for (const k of SYNCED_PREFS) { const x = adapter.get(k, undefined); if (x !== undefined) v[k] = x; } return { v, at: adapter.get('prefsAt', '') || '' }; },
      setSyncedPref(k, val) { adapter.set(k, val); adapter.set('prefsAt', now()); },
      applyPrefs(p) { for (const k of SYNCED_PREFS) if (p.v && p.v[k] !== undefined) adapter.set(k, p.v[k]); adapter.set('prefsAt', p.at || ''); },
      setPref: (k, v) => adapter.set(k, v),
      // ---- synchro ----
      savedAt,
      syncBase: id => adapter.get(key(id, 'syncBase'), '') || '',
      setSyncBase: (id, v) => adapter.set(key(id, 'syncBase'), v),
      setSavedAt: (id, v) => adapter.set(key(id, 'savedAt'), v),
      payload: id => toPayload(self.name(id), self.load(id), savedAt(id)),
      applyPayload(id, pl) {
        const p = find(id); if (p) p.n = pl.n || p.n; else profiles.push({ id, n: pl.n || id });
        writeProfiles();
        const snap = fromPayload(pl); for (const k of KEYS) adapter.set(key(id, k), snap[k]);
        adapter.set(key(id, 'savedAt'), pl.savedAt || '');
      },
    };
    return self;
  }

  // Synchronise tous les profils avec le distant. Pour chaque profil, `syncBase` est la date sur laquelle les deux côtés
  // étaient d'accord à la dernière synchro : seul le local a changé → envoi ; seul le distant → réception ;
  // les deux → fusion, si `manual` et si `confirmMerge(nomDuProfil)` répond oui (sinon le conflit reste en attente).
  // Retourne { refresh, conflicts, pushed } : `refresh` indique que l'état local a changé et doit être rechargé.
  async function sync(store, remote, { manual = false, confirmMerge = null } = {}) {
    const rp = await remote.read();
    const push = {}; let conflicts = 0, refresh = false;
    // réglages : le plus récent des deux côtés gagne
    const rprefs = rp[PREFS_KEY], lprefs = store.syncedPrefs();
    if (rprefs && (rprefs.at || '') > lprefs.at) { store.applyPrefs(rprefs); refresh = true; }
    else if (lprefs.at && lprefs.at > ((rprefs && rprefs.at) || '')) push[PREFS_KEY] = lprefs;
    for (const id of new Set([...store.profiles().map(p => p.id), ...Object.keys(rp).filter(k => k !== PREFS_KEY)])) {
      const r = rp[id];
      if (store.has(id) && !r) { push[id] = store.payload(id); continue; }                                      // profil seulement ici : on l'envoie
      if (!store.has(id) && r) { store.applyPayload(id, r); store.setSyncBase(id, r.savedAt || ''); refresh = true; continue; }   // seulement chez le distant : on le reçoit
      const l = store.payload(id), base = store.syncBase(id);
      const localChanged = l.savedAt !== base, remoteChanged = (r.savedAt || '') !== base;
      if (localChanged && !remoteChanged) push[id] = l;
      else if (!localChanged && remoteChanged) { store.applyPayload(id, r); store.setSyncBase(id, r.savedAt || ''); refresh = true; }
      else if (localChanged && remoteChanged) {
        if (samePayload(l, r)) { store.setSyncBase(id, l.savedAt); store.setSavedAt(id, r.savedAt || l.savedAt); }
        else if (manual && confirmMerge && await confirmMerge(l.n)) { const m = mergePayloads(l, r); store.applyPayload(id, m); push[id] = m; refresh = true; }
        else conflicts++;
      }
    }
    if (Object.keys(push).length) { await remote.write(push); for (const [id, pl] of Object.entries(push)) if (id !== PREFS_KEY) store.setSyncBase(id, pl.savedAt || ''); }
    return { refresh, conflicts, pushed: Object.keys(push).filter(k => k !== PREFS_KEY).length };
  }

  return { create, sync, toPayload, samePayload, mergePayloads, exportFile, inspectImport, importInto };
});
