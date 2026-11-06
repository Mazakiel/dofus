// Règles de progression : ce qui est fait, disponible, bloqué, et ce que valider ou décocher entraîne en cascade.
//
// Le module possède l'état suivi (succès obtenus, quêtes faites, niveau, Dofus…) et ses caches. Toute modification de
// cet état, même directe (`P.state.sq.add(12)`), invalide les caches : plus aucun appel à vider à la main.
// Il ne connaît ni le DOM, ni le stockage, ni les options d'affichage : la page lui donne les données une fois
// (`create(data)`), charge l'état (`load`), puis l'interroge.
//
// Chargeable dans le navigateur (global `Progression`) et par Node (`require`), donc testable sans page.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Progression = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Ensemble dont toute modification appelle `onChange`
  class TrackedSet extends Set {
    constructor(onChange) { super(); this._onChange = onChange; }
    add(x) { if (!this.has(x)) { super.add(x); this._onChange(); } return this; }
    delete(x) { const r = super.delete(x); if (r) this._onChange(); return r; }
    clear() { if (this.size) { super.clear(); this._onChange(); } }
    replace(items) { super.clear(); for (const x of items) super.add(x); this._onChange(); }
  }
  // Objet dont toute écriture ou suppression de propriété appelle `onChange`
  const trackedObject = onChange => new Proxy({}, {
    set(t, k, v) { t[k] = v; onChange(); return true; },
    deleteProperty(t, k) { const had = k in t; delete t[k]; if (had) onChange(); return true; },
  });

  function create(data) {
    const SC = data || { categories: [], succes: [], objectifs: {}, quetes: {}, dofus: [] };
    const SACH = Object.fromEntries(SC.succes.map(a => [a.id, a]));
    const SDZ = Object.fromEntries((SC.dofus || []).map(d => [d.id, d]));

    // ---- index calculés une fois : qui dépend de qui ----
    const push = (m, k, v) => (m[k] = m[k] || []).push(v);
    const QOWN = {}, SPARENTS = {}, QNEXT = {}, QBYPREA = {}, QBYPRED = {}, DZ_BY_A = {}, DZ_BY_Q = {};
    for (const o of Object.values(SC.objectifs)) { if (o.t === 'q') push(QOWN, o.r, o.a); else if (o.t === 'a') push(SPARENTS, o.r, o.a); }
    for (const [qid, q] of Object.entries(SC.quetes)) {
      (q.pre || []).forEach(p => push(QNEXT, p, +qid));
      (q.preA || []).forEach(a => push(QBYPREA, a, +qid));
      (q.preD || []).forEach(d => push(QBYPRED, d, +qid));
    }
    for (const d of SC.dofus || []) {
      if (d.a && !d.pre) push(DZ_BY_A, d.a, d.id);
      (d.pa || []).forEach(a => push(DZ_BY_A, a, d.id));
      if (d.q) push(DZ_BY_Q, d.q, d.id);
    }

    // ---- état suivi + caches : une mutation invalide tout ----
    const memoDone = new Map(), memoAvail = new Map();
    let level = 200;
    const invalidate = () => { memoDone.clear(); memoAvail.clear(); };
    const state = {
      sdone: new TrackedSet(invalidate),        // succès marqués obtenus
      sq: new TrackedSet(invalidate),           // quêtes faites
      sodone: new TrackedSet(invalidate),       // autres objectifs cochés (monstre, donjon, exploration…)
      sdzGoals: new TrackedSet(invalidate),     // Dofus visés
      sdzState: trackedObject(invalidate),      // Dofus : 'owned' | 'missing' forcé à la main
      qState: trackedObject(invalidate),        // quêtes : 's' commencée | 'b' bloquée
      get level() { return level; },
      set level(v) { if (v !== level) { level = v; invalidate(); } },
    };
    const clearObject = o => { for (const k of Object.keys(o)) delete o[k]; };
    const snapshot = () => ({ sdone: [...state.sdone], sq: [...state.sq], sodone: [...state.sodone], sLevel: level,
      sdzState: { ...state.sdzState }, sdzGoals: [...state.sdzGoals], qState: { ...state.qState } });
    function load(s = {}) {
      state.sdone.replace(s.sdone || []); state.sq.replace(s.sq || []); state.sodone.replace(s.sodone || []);
      state.sdzGoals.replace(s.sdzGoals || []);
      clearObject(state.sdzState); Object.assign(state.sdzState, s.sdzState || {});
      clearObject(state.qState); Object.assign(state.qState, s.qState || {});
      state.level = s.sLevel == null ? 200 : s.sLevel; invalidate();
    }
    // Exécute `fn` sur un état modifié, puis remet l'état d'origine (ex. « quels succès seraient complétés par cette validation »)
    function simulate(fn) { const snap = snapshot(); try { return fn(); } finally { load(snap); } }

    // ---- faits : obtenu / disponible ----
    const questDone = qid => state.sq.has(qid) || (QOWN[qid] || []).some(a => state.sdone.has(a));
    function achDone(id, stack) {
      if (state.sdone.has(id)) return true;
      if (memoDone.has(id)) return memoDone.get(id);
      const a = SACH[id]; if (!a || !a.ob.length) return false;
      stack = stack || new Set(); if (stack.has(id)) return false;   // succès cycliques : on s'arrête
      stack.add(id); const r = a.ob.every(oid => objDone(oid, stack)); stack.delete(id);
      memoDone.set(id, r); return r;
    }
    function objDone(oid, stack) {
      const o = SC.objectifs[oid]; if (!o) return false;
      if (state.sdone.has(o.a)) return true;                 // succès obtenu → tous ses objectifs le sont
      if (o.t === 'q') return state.sq.has(o.r);
      if (o.t === 'a') return achDone(o.r, stack);
      if (o.t === 'lvl') return level >= o.r;                // « Atteindre le niveau N » : d'après le niveau saisi
      return state.sodone.has(+oid);
    }
    const achProg = a => [a.ob.filter(oid => objDone(oid)).length, a.ob.length];
    // un succès seulement prérequis (Ocre d'ambre pour le Dofus Ocre) ne suffit pas : le Dofus se coche à la main
    const dofusAuto = d => !d.pre && ((!!d.a && achDone(d.a)) || (!!d.q && questDone(d.q)));
    const dofusOwned = d => state.sdzState[d.id] === 'owned' ? true : state.sdzState[d.id] === 'missing' ? false : dofusAuto(d);
    function setDofusOwned(d, on) {
      if (on === dofusAuto(d)) delete state.sdzState[d.id]; else state.sdzState[d.id] = on ? 'owned' : 'missing';
      if (on) state.sdzGoals.delete(d.id);
    }
    const questAvailable = qid => { const q = SC.quetes[qid] || {};
      return (q.lv || 0) <= level && (q.pre || []).every(questDone) && (q.preA || []).every(a => achDone(a)) && (q.preD || []).every(d => !SDZ[d] || dofusOwned(SDZ[d])); };
    function achAvailable(id, stack = new Set()) {
      if (memoAvail.has(id)) return memoAvail.get(id);
      if (stack.has(id)) return false;
      const a = SACH[id]; if (!a) return false;
      if (state.sdone.has(id) || achDone(id)) { memoAvail.set(id, true); return true; }
      // Indisponible tant qu'un sous-succès exigé n'est pas fini ; sinon disponible si un objectif restant est faisable maintenant.
      const obs = a.ob.map(oid => [oid, SC.objectifs[oid]]).filter(([, o]) => o);
      if (obs.some(([oid, o]) => o.t === 'a' && !objDone(oid))) { memoAvail.set(id, false); return false; }
      stack.add(id);
      const r = obs.some(([oid, o]) => {
        if (objDone(oid)) return false;
        if (o.t === 'q') return questAvailable(o.r);
        if (o.t === 'lvl') return level >= o.r;
        return true;
      });
      stack.delete(id); memoAvail.set(id, r); return r;
    }
    // Statut d'une quête : faite (cochée) · bloquée / commencée (saisis à la main) · disponible · indisponible
    const questStatus = id => questDone(id) ? 'done' : state.qState[id] === 'b' ? 'bl' : state.qState[id] === 's' ? 'st' : questAvailable(id) ? 'av' : 'lock';
    const qName = qid => (SC.quetes[qid] && SC.quetes[qid].n) || `quête ${qid}`;
    // Ce qui manque pour pouvoir faire une quête (niveau, quêtes, succès, Dofus à posséder)
    function lockReasons(qid) {
      const q = SC.quetes[qid] || {}, out = [];
      if ((q.lv || 0) > level) out.push(`niveau ${q.lv} requis`);
      for (const p of q.pre || []) if (!questDone(p)) out.push(`quête « ${qName(p)} »`);
      for (const a of q.preA || []) if (!achDone(a)) out.push(`succès « ${SACH[a] ? SACH[a].n : a} »`);
      for (const d of q.preD || []) if (SDZ[d] && !dofusOwned(SDZ[d])) out.push(`posséder le ${SDZ[d].n}`);
      return out;
    }
    // Qu'est-ce qui reste affiché, d'après les options « Afficher les obtenus / indisponibles ». Une quête marquée à la main reste visible.
    const questShown = (id, o) => questDone(id) ? !!o.showDone : (!!o.showLocked || questAvailable(id) || !!state.qState[id]);
    const achShown = (id, o) => achDone(id) ? !!o.showDone : (!!o.showLocked || achAvailable(id));

    // ---- cascade : ce que valider (collectPrereqs) ou décocher (collectDependents) un élément entraîne ----
    // Un succès implique ses objectifs (sous-succès, quêtes, autres). Une quête implique ses conditions de départ :
    // quêtes à avoir terminées et succès à avoir obtenus, récursivement. C'est ainsi que « Quatre sur six »
    // remonte jusqu'aux succès des 4 premiers Dofus primordiaux.
    function collectPrereqs(kind, id) {
      const acc = { a: new Set(), q: new Set(), o: new Set(), d: new Set() }, seen = new Set();
      const quest = qid => {
        if (seen.has('q' + qid)) return; seen.add('q' + qid);
        if (!questDone(qid)) acc.q.add(qid);
        const q = SC.quetes[qid]; if (!q) return;
        (q.pre || []).forEach(quest); (q.preA || []).forEach(ach); (q.preD || []).forEach(dofus);
      };
      // Dofus à posséder (condition d'une quête) : le Dofus lui-même, puis ce qui le donne (succès, quête, ou prérequis)
      const dofus = did => {
        if (seen.has('d' + did)) return; seen.add('d' + did);
        const d = SDZ[did]; if (!d || d.cadeau) return;
        if (!dofusOwned(d)) acc.d.add(did);
        if (d.a) ach(d.a); if (d.q) quest(d.q); (d.pa || []).forEach(ach);
      };
      const objs = aid => { for (const oid of (SACH[aid] || { ob: [] }).ob) { const o = SC.objectifs[oid]; if (!o) continue;
        if (o.t === 'a') ach(o.r); else if (o.t === 'q') quest(o.r); else if (o.t === 'x' && !state.sodone.has(+oid)) acc.o.add(+oid); } };
      const ach = aid => {
        if (seen.has('a' + aid)) return; seen.add('a' + aid);
        if (!state.sdone.has(aid) && !achDone(aid)) acc.a.add(aid);
        objs(aid);
      };
      if (kind === 'a') { seen.add('a' + id); objs(id); }
      else if (kind === 'd') { seen.add('d' + id); const d = SDZ[id]; if (d) { if (d.a) ach(d.a); if (d.q) quest(d.q); (d.pa || []).forEach(ach); } }   // Dofus : son succès, sa quête et ses succès prérequis, inclus
      else { seen.add('q' + id); const q = SC.quetes[id]; if (q) { (q.pre || []).forEach(quest); (q.preA || []).forEach(ach); (q.preD || []).forEach(dofus); } }
      return acc;
    }
    // Dépendances inverses : quête → quêtes qui l'exigent, succès qui la contiennent, Dofus qu'elle donne ;
    // succès → succès parents, quêtes qui l'exigent, Dofus qu'il donne ou dont il est prérequis ; Dofus → quêtes qui l'exigent.
    function collectDependents(kind, id) {
      const seen = new Set(), queue = [];
      const enqueue = (k, x) => { if (seen.has(k + x)) return; seen.add(k + x); queue.push([k, x]); };
      // un succès décoché emporte ses propres objectifs (sinon il resterait validé par eux), mais pas ses prérequis
      const contained = aid => {
        enqueue('a', aid);
        for (const oid of (SACH[aid] || { ob: [] }).ob) {
          const o = SC.objectifs[oid]; if (!o) continue;
          if (o.t === 'q') enqueue('q', o.r); else if (o.t === 'x') enqueue('o', +oid); else if (o.t === 'a' && !seen.has('a' + o.r)) contained(o.r);
        }
      };
      if (kind === 'a') contained(id);
      else if (kind === 'q') enqueue('q', id);
      else if (kind === 'o') enqueue('o', id);
      else if (kind === 'd') { enqueue('d', id); const d = SDZ[id]; if (d && !d.pre) { if (d.a) contained(d.a); if (d.q) enqueue('q', d.q); } }
      while (queue.length) {
        const [k, x] = queue.shift();
        if (k === 'q') { (QOWN[x] || []).forEach(a => enqueue('a', a)); (QNEXT[x] || []).forEach(q => enqueue('q', q)); (DZ_BY_Q[x] || []).forEach(d => enqueue('d', d)); }
        else if (k === 'a') { (SPARENTS[x] || []).forEach(a => enqueue('a', a)); (QBYPREA[x] || []).forEach(q => enqueue('q', q)); (DZ_BY_A[x] || []).forEach(d => enqueue('d', d)); }
        else if (k === 'o') { const o = SC.objectifs[x]; if (o) enqueue('a', o.a); }
        else if (k === 'd') (QBYPRED[x] || []).forEach(q => enqueue('q', q));
      }
      // on ne garde que ce qui est actuellement validé
      const res = { a: new Set(), q: new Set(), o: new Set(), d: new Set() };
      for (const key of seen) {
        const k = key[0], x = +key.slice(1);
        const ok = k === 'q' ? questDone(x) : k === 'a' ? (state.sdone.has(x) || achDone(x)) : k === 'o' ? state.sodone.has(x) : (SDZ[x] && dofusOwned(SDZ[x]));
        if (ok) res[k].add(x);
      }
      return res;
    }
    function applyRemoval(rm) {
      rm.a.forEach(a => state.sdone.delete(a)); rm.q.forEach(q => state.sq.delete(q)); rm.o.forEach(o => state.sodone.delete(o));
      // Dofus : on retire le forçage, puis on force « non obtenu » s'il reste obtenu par ailleurs
      rm.d.forEach(id => { delete state.sdzState[id]; if (dofusOwned(SDZ[id])) state.sdzState[id] = 'missing'; });
    }
    // Pour des Dofus visés : les quêtes et succès qui restent à faire pour les obtenir, et pour quel Dofus.
    function goalsFor(dofusList) {
      const q = {}, a = {};
      for (const d of dofusList) { const acc = collectPrereqs('d', d.id);
        acc.q.forEach(id => push(q, id, d)); acc.a.forEach(id => push(a, id, d)); }
      return { q, a };
    }

    return {
      state, index: { SACH, SDZ, QOWN, QNEXT, SPARENTS },
      load, snapshot, simulate,
      questDone, achDone, objDone, achProg, dofusAuto, dofusOwned, setDofusOwned,
      questAvailable, achAvailable, questStatus, lockReasons, questShown, achShown,
      collectPrereqs, collectDependents, applyRemoval, goalsFor,
    };
  }

  return { create, TrackedSet };
});
