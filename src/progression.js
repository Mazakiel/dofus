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
      (d.pq || []).forEach(q => push(DZ_BY_Q, q, d.id));
      if (d.q) push(DZ_BY_Q, d.q, d.id);
    }

    // Titres et ornements donnés par un succès (`ti` et `or` des succès) : { kind: 't' | 'o', id, n, a: succès qui le donne, i: icône d'ornement }
    // Un titre ou un ornement n'a pas d'état propre : il est obtenu quand son succès l'est.
    const RW = [], RWBY = { t: {}, o: {} };
    for (const a of SC.succes) {
      for (const t of a.ti || []) if (!RWBY.t[t.id]) RW.push(RWBY.t[t.id] = { kind: 't', id: t.id, n: t.n, a: a.id });
      for (const o of a.or || []) if (!RWBY.o[o.id]) RW.push(RWBY.o[o.id] = { kind: 'o', id: o.id, n: o.n, a: a.id, i: o.i });
    }

    // ---- état suivi + caches : une mutation invalide tout ----
    const memoDone = new Map(), memoAvail = new Map(), listeners = new Set();
    let level = 200, quiet = 0;
    const invalidate = () => { memoDone.clear(); memoAvail.clear(); };
    // une modification invalide les caches puis prévient les abonnés (la page s'en sert pour sauvegarder) ; `load` et `simulate` restent silencieux
    const changed = () => { invalidate(); if (!quiet) listeners.forEach(fn => fn()); };
    const silently = fn => { quiet++; try { return fn(); } finally { quiet--; invalidate(); } };
    const state = {
      sdone: new TrackedSet(changed),        // succès marqués obtenus
      sq: new TrackedSet(changed),           // quêtes faites
      sodone: new TrackedSet(changed),       // autres objectifs cochés (monstre, donjon, exploration…)
      sdzGoals: new TrackedSet(changed),     // Dofus visés
      rwGoals: new TrackedSet(changed),      // titres et ornements visés : 't57', 'o56'
      sdzState: trackedObject(changed),      // Dofus : 'owned' | 'missing' forcé à la main
      qState: trackedObject(changed),        // quêtes : 's' commencée | 'b' bloquée
      get level() { return level; },
      set level(v) { if (v !== level) { level = v; changed(); } },
    };
    const clearObject = o => { for (const k of Object.keys(o)) delete o[k]; };
    const snapshot = () => ({ sdone: [...state.sdone], sq: [...state.sq], sodone: [...state.sodone], sLevel: level,
      sdzState: { ...state.sdzState }, sdzGoals: [...state.sdzGoals], rwGoals: [...state.rwGoals], qState: { ...state.qState } });
    // Charge un état (depuis le stockage, la synchro, un import) : silencieux, ce n'est pas une modification de l'utilisateur
    function load(s = {}) {
      silently(() => {
        state.sdone.replace(s.sdone || []); state.sq.replace(s.sq || []); state.sodone.replace(s.sodone || []);
        state.sdzGoals.replace(s.sdzGoals || []); state.rwGoals.replace(s.rwGoals || []);
        clearObject(state.sdzState); Object.assign(state.sdzState, s.sdzState || {});
        clearObject(state.qState); Object.assign(state.qState, s.qState || {});
        state.level = s.sLevel == null ? 200 : s.sLevel;
        // Objectifs cochés à la main avant que DofusDB ne les relie à une quête : c'est la quête qui est faite
        for (const [oid, o] of Object.entries(SC.objectifs)) if (o.t === 'q' && state.sodone.has(+oid)) { state.sq.add(o.r); state.sodone.delete(+oid); }
      });
    }
    // Exécute `fn` sur un état modifié, puis remet l'état d'origine (ex. « quels succès seraient complétés par cette validation »)
    function simulate(fn) { const snap = snapshot(); try { return silently(fn); } finally { load(snap); } }
    // `fn` est appelé après chaque modification de l'état ; retourne la fonction qui désabonne
    function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

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
    // Niveau exigé pour lancer une quête : le critère de départ (PL>179 → 180) prime sur le niveau indicatif de la fiche
    const reqLevel = q => q.pl != null ? q.pl + 1 : (q.lv || 0);
    // « Quête en cours » (Qa=) : commencée ou bloquée à la main, ou déjà terminée
    const questOngoing = p => questDone(p) || state.qState[p] === 's' || state.qState[p] === 'b';
    const questAvailable = qid => { const q = SC.quetes[qid] || {};
      return reqLevel(q) <= level && (q.pre || []).every(questDone) && (q.preE || []).every(questOngoing) && (q.preA || []).every(a => achDone(a)) && (q.preD || []).every(d => !SDZ[d] || dofusOwned(SDZ[d])); };
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
      if (reqLevel(q) > level) out.push(`niveau ${reqLevel(q)} requis`);
      for (const p of q.pre || []) if (!questDone(p)) out.push(`quête « ${qName(p)} »`);
      for (const p of q.preE || []) if (!questOngoing(p)) out.push(`quête « ${qName(p)} » en cours`);
      for (const a of q.preA || []) if (!achDone(a)) out.push(`succès « ${SACH[a] ? SACH[a].n : a} »`);
      for (const d of q.preD || []) if (SDZ[d] && !dofusOwned(SDZ[d])) out.push(`posséder le ${SDZ[d].n}`);
      return out;
    }
    // Qu'est-ce qui reste affiché, d'après les options « Afficher les obtenus / indisponibles ». Une quête marquée à la main reste visible.
    const questShown = (id, o) => questDone(id) ? !!o.showDone : (!!o.showLocked || questAvailable(id) || !!state.qState[id]);
    // Un méta-succès (qui regroupe d'autres succès) n'est « disponible » qu'une fois ses sous-succès finis, mais on peut déjà y travailler :
    // il est faisable maintenant si lui-même ou l'un de ses sous-succès non finis, à n'importe quelle profondeur, l'est.
    function achDoable(id, seen = new Set()) {
      if (achDone(id) || seen.has(id)) return false; seen.add(id);
      const a = SACH[id]; if (!a) return false;
      return achAvailable(id) || a.ob.some(oid => { const o = SC.objectifs[oid]; return o && o.t === 'a' && !objDone(oid) && achDoable(o.r, seen); });
    }
    const achShown = (id, o) => achDone(id) ? !!o.showDone : (!!o.showLocked || achDoable(id));

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
        if (d.a) ach(d.a); if (d.q) quest(d.q); (d.pa || []).forEach(ach); (d.pq || []).forEach(quest);
      };
      const objs = aid => { for (const oid of (SACH[aid] || { ob: [] }).ob) { const o = SC.objectifs[oid]; if (!o) continue;
        if (o.t === 'a') ach(o.r); else if (o.t === 'q') quest(o.r); else if (o.t === 'x' && !state.sodone.has(+oid)) acc.o.add(+oid); } };
      const ach = aid => {
        if (seen.has('a' + aid)) return; seen.add('a' + aid);
        if (!state.sdone.has(aid) && !achDone(aid)) acc.a.add(aid);
        objs(aid);
      };
      if (kind === 'a') { seen.add('a' + id); objs(id); }
      else if (kind === 'rw') ach(id);   // titre ou ornement : le succès qui le donne, avec tout ce qu'il demande
      else if (kind === 'd') { seen.add('d' + id); const d = SDZ[id]; if (d) { if (d.a) ach(d.a); if (d.q) quest(d.q); (d.pa || []).forEach(ach); (d.pq || []).forEach(quest); } }   // Dofus : son succès, sa quête et ses succès prérequis, inclus
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

    // ---- Suggestions : quoi faire maintenant ----
    // Un score additionne des points par critère ; chaque préréglage multiplie certains critères. Rien n'est caché : chaque suggestion
    // rend les raisons qui l'ont fait monter (`reasons`), et `suggestInfo` expose le barème.
    const SUGGEST_BASE = {
      goal: { first: 40, more: 10, max: 60 },         // sert un objectif (Dofus, titre, ornement visé) : 40, puis 10 par objectif de plus
      started: 25,                                   // quête déjà commencée
      completes: 25,                                 // dernière quête d'un succès ; sinon jusqu'à `progress` selon l'avancement du succès
      progress: 10,
      unlock: { each: 1.2, max: 30 },                // quêtes qu'elle ouvre (directement ou plus loin) : « prérequis de beaucoup de choses »
      reward: { item: 10, itemMax: 20, dofus: 20 },  // titre ou ornement (10 chacun, 20 au plus) ; Dofus : 20
      level: [[10, 15], [30, 8], [60, 3]],           // quête de niveau proche du tien : écart ≤ 10 → 15, ≤ 30 → 8, ≤ 60 → 3
      chain: { each: 2, max: 10 },                   // prérequis déjà faits : tu es au milieu d'une chaîne
    };
    const SUGGEST_PRESETS = {
      mix:     { goal: 1,   started: 1,  completes: 1,  unlock: 1,   reward: 1,   level: 1,  chain: 1 },
      goals:   { goal: 2.5, started: .5, completes: .5, unlock: .5,  reward: .5,  level: .5, chain: .5 },
      level:   { goal: .5,  started: .5, completes: .5, unlock: .5,  reward: .5,  level: 3,  chain: .5 },
      unlock:  { goal: .5,  started: .5, completes: .5, unlock: 2.5, reward: .5,  level: .5, chain: .5 },
      rewards: { goal: .5,  started: .5, completes: .5, unlock: .5,  reward: 2.5, level: .5, chain: .5 },
    };
    // Quêtes qui ont besoin de celle-ci, directement ou plus loin (par une quête, un succès qu'elle complète ou un Dofus qu'elle donne) et pas encore faites
    function dependentQuests(qid) {
      const out = new Set(), seen = new Set([qid]), stack = [qid];
      while (stack.length) {
        const x = stack.pop(), next = [...(QNEXT[x] || [])];
        for (const a of QOWN[x] || []) (QBYPREA[a] || []).forEach(n => next.push(n));
        for (const d of DZ_BY_Q[x] || []) (QBYPRED[d] || []).forEach(n => next.push(n));
        for (const n of next) if (!seen.has(n)) { seen.add(n); if (!questDone(n)) out.add(n); stack.push(n); }
      }
      return out;
    }
    // Titres et ornements d'un succès, et Dofus qu'il donne (ou que donne la quête)
    const rewardsOfAch = a => [...(a.ti || []).map(t => ({ kind: 't', n: t.n })), ...(a.or || []).map(o => ({ kind: 'o', n: o.n })),
      ...(SC.dofus || []).filter(d => d.a === a.id && !d.pre && /récompense de succès|description de succès/.test(d.src || '')).map(d => ({ kind: 'd', n: d.n }))];
    const rewardsOfQuest = qid => (SC.dofus || []).filter(d => d.q === qid && !d.pre && d.src === 'récompense de quête').map(d => ({ kind: 'd', n: d.n }));
    const rewardPoints = (list, B, f) => Math.min(list.filter(r => r.kind !== 'd').length * B.reward.item, B.reward.itemMax) * f.reward + list.filter(r => r.kind === 'd').length * B.reward.dofus * f.reward;

    // Quêtes à faire maintenant, du plus conseillée à la moins conseillée (les succès ne sont pas proposés : ce sont leurs quêtes qui le sont).
    // Options : preset, goalQ (quêtes qui servent un objectif : { id: [récompenses visées] }),
    // questVisible(id) (ce que la page affiche), limit.
    // Jamais proposés : le fait, ce que tu as marqué bloqué, ce qui n'est pas faisable maintenant.
    function suggest({ preset = 'mix', goalQ = {}, questVisible = () => true, limit = 12 } = {}) {
      const B = SUGGEST_BASE, f = SUGGEST_PRESETS[preset] || SUGGEST_PRESETS.mix, out = [];
      const goalPts = n => Math.min(B.goal.first + B.goal.more * (n - 1), B.goal.max) * f.goal;
      for (const sid of Object.keys(SC.quetes)) {
        const id = +sid, q = SC.quetes[id], st = questStatus(id);
        if ((st !== 'av' && st !== 'st') || !questAvailable(id) || !questVisible(id)) continue;
        let score = 0; const reasons = [];
        if (goalQ[id] && goalQ[id].length) { score += goalPts(goalQ[id].length); reasons.push({ t: 'goal', items: goalQ[id] }); }
        if (st === 'st') { score += B.started * f.started; reasons.push({ t: 'started' }); }
        let best = null;
        for (const a of (QOWN[id] || []).map(i => SACH[i]).filter(a => a && !achDone(a.id))) {
          const [d, n] = achProg(a); if (n < 2) continue;
          if (d + 1 === n) { best = { a, d: d + 1, n, last: true }; break; }
          if (!best || (d + 1) / n > best.d / best.n) best = { a, d: d + 1, n, last: false };
        }
        if (best) {
          if (best.last) { score += B.completes * f.completes; reasons.push({ t: 'completes', ach: best.a.n }); }
          else { score += Math.round(B.progress * best.d / best.n) * f.completes; reasons.push({ t: 'progress', ach: best.a.n, d: best.d, n: best.n }); }
        }
        const dep = dependentQuests(id).size;
        if (dep) { score += Math.min(dep * B.unlock.each, B.unlock.max) * f.unlock; reasons.push({ t: 'unlock', n: dep }); }
        const rw = [...rewardsOfQuest(id), ...(QOWN[id] || []).flatMap(i => SACH[i] ? rewardsOfAch(SACH[i]) : [])];
        const rwSeen = new Set(), rws = rw.filter(r => !rwSeen.has(r.kind + r.n) && rwSeen.add(r.kind + r.n));
        if (rws.length) { score += rewardPoints(rws, B, f); reasons.push({ t: 'reward', items: rws }); }
        const gap = level - (q.lv || 0);
        if (q.lv && gap >= 0) { const band = B.level.find(([max]) => gap <= max); if (band) { score += band[1] * f.level; reasons.push({ t: 'level', lv: q.lv }); } }
        const done = [...(q.pre || []).filter(questDone), ...(q.preA || []).filter(a => achDone(a))].length;
        if (done) { score += Math.min(done * B.chain.each, B.chain.max) * f.chain; reasons.push({ t: 'chain', n: done }); }
        out.push({ k: 'q', id, score: Math.round(score), reasons });
      }
      out.sort((x, y) => y.score - x.score || x.id - y.id);
      // Pas plus de deux quêtes d'un même succès côte à côte : sinon un seul succès à dix quêtes remplit toute la liste
      const perAch = {}, kept = [], rest = [];
      for (const s of out) {
        const key = s.k === 'q' ? (s.reasons.find(r => r.t === 'progress' || r.t === 'completes') || {}).ach : null;
        if (key && (perAch[key] = (perAch[key] || 0) + 1) > 2) rest.push(s); else kept.push(s);
      }
      return [...kept, ...rest].slice(0, limit);
    }

    // Un Dofus, un titre ou un ornement : obtenu ?
    const rewardOwned = r => r.kind ? achDone(r.a) : dofusOwned(r);
    // Pour des récompenses visées (Dofus, titres, ornements) : les quêtes et succès qui restent à faire pour les obtenir, et pour laquelle.
    function goalsFor(rewardList) {
      const q = {}, a = {};
      for (const d of rewardList) { const acc = d.kind ? collectPrereqs('rw', d.a) : collectPrereqs('d', d.id);
        acc.q.forEach(id => push(q, id, d)); acc.a.forEach(id => push(a, id, d)); }
      return { q, a };
    }

    return {
      state, index: { SACH, SDZ, QOWN, QNEXT, SPARENTS, RW, RWBY },
      load, snapshot, simulate, subscribe,
      questDone, achDone, objDone, achProg, dofusAuto, dofusOwned, setDofusOwned, rewardOwned, suggest, suggestInfo: { base: SUGGEST_BASE, presets: SUGGEST_PRESETS },
      questAvailable, achAvailable, achDoable, questStatus, lockReasons, reqLevel, questOngoing, questShown, achShown,
      collectPrereqs, collectDependents, applyRemoval, goalsFor,
    };
  }

  return { create };
});
