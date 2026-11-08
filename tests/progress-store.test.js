// Tests de la progression persistée : profils, sauvegarde, synchro, export / import. Stockage en mémoire, distant simulé.
const test = require('node:test');
const assert = require('node:assert/strict');
const PS = require('../src/progress-store.js');
const Progression = require('../src/progression.js');

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { get: (k, d) => (m.has(k) ? structuredClone(m.get(k)) : d), set: (k, v) => { m.set(k, structuredClone(v)); }, del: k => { m.delete(k); }, keys: () => [...m.keys()], m };
};
const clock = () => { let n = 0; return () => `2026-01-01T00:00:${String(++n).padStart(2, '0')}.000Z`; };
const snap = o => ({ sdone: [], sq: [], sodone: [], sLevel: 200, sdzState: {}, sdzGoals: [], rwGoals: [], qState: {}, ...o });
const fakeRemote = (docs = {}) => ({ docs, read: async () => structuredClone(docs), write: async p => { Object.assign(docs, structuredClone(p)); } });

test('premier chargement : un profil « Défaut » qui reprend les anciennes clés sans profil', () => {
  const a = memory({ sq: [1, 2], sLevel: 150 });
  const s = PS.create(a);
  assert.deepEqual(s.profiles(), [{ id: 'default', n: 'Défaut' }]);
  assert.equal(s.current(), 'default');
  assert.deepEqual(s.load().sq, [1, 2]);
  assert.equal(s.load().sLevel, 150);
  assert.ok(a.m.has('sq'), 'les anciennes clés restent en secours');
});

test("une sauvegarde relue est identique, et la date ne bouge que si quelque chose a changé", () => {
  const s = PS.create(memory(), { now: clock() });
  assert.deepEqual(s.load(), snap({}));
  const a = snap({ sq: [3, 4], sdzState: { 7: 'owned' }, qState: { 9: 's' }, sLevel: 120 });
  assert.equal(s.save(a), true);
  assert.deepEqual(s.load(), a);
  const t1 = s.savedAt('default');
  assert.equal(s.save(a), false);
  assert.equal(s.savedAt('default'), t1, 'rien n’a changé : même date');
  assert.equal(s.save({ ...a, sq: [3, 4, 5] }), true);
  assert.notEqual(s.savedAt('default'), t1);
});

test('deux profils créés au même instant ont des identifiants différents', () => {
  const s = PS.create(memory(), { now: clock() });
  const ids = Array.from({ length: 200 }, (_, i) => s.add('P' + i));
  assert.equal(new Set(ids).size, 200);
  assert.equal(s.profiles().length, 201);
});

test('profils : ajouter, renommer, changer de profil actif, supprimer', () => {
  const a = memory(); const s = PS.create(a, { now: clock() });
  const id = s.add('Alt'); s.rename(id, 'Alt Eniripsa');
  assert.equal(s.name(id), 'Alt Eniripsa');
  s.switchTo(id); assert.equal(PS.create(a).current(), id, 'le profil actif est mémorisé');
  s.save(snap({ sq: [1] }), id); s.setSyncBase(id, 'x');
  assert.equal(s.remove('default'), true);
  assert.equal(s.remove(id), false, 'on garde au moins un profil');
  assert.equal(s.current(), id);
  assert.equal(s.has('default'), false);
  const s2 = PS.create(a); s2.add('B');
  assert.equal(s2.remove(id), true);
  assert.deepEqual(a.keys().filter(k => k.startsWith(`p:${id}:`)), [], 'toutes les clés du profil, synchro comprise, disparaissent');
});

test("payload : aller-retour, fusion par union (le local l'emporte pour les états), comparaison sans ordre", () => {
  const s = PS.create(memory(), { now: clock() });
  s.save(snap({ sq: [1, 2], qState: { 5: 's' }, sdzState: { 1: 'owned' }, sLevel: 120 }));
  const l = s.payload('default');
  const r = { ...l, sq: [2, 3], qState: JSON.stringify({ 5: 'b', 6: 'b' }), sLevel: 180, savedAt: 'autre' };
  const m = PS.mergePayloads(l, r, 'now');
  assert.deepEqual(m.sq.sort(), [1, 2, 3]);
  assert.deepEqual(JSON.parse(m.qState), { 5: 's', 6: 'b' });
  assert.equal(m.sLevel, 180, 'le niveau le plus haut'); assert.equal(m.savedAt, 'now');
  assert.equal(PS.samePayload(l, { ...l, sq: [2, 1] }), true);
  assert.equal(PS.samePayload(l, r), false);
  s.applyPayload('autre', r);
  assert.equal(s.has('autre'), true);
  assert.deepEqual(s.load('autre').qState, { 5: 'b', 6: 'b' });
});

test('synchro : un profil seulement local est envoyé, un profil seulement distant est reçu', async () => {
  const s = PS.create(memory(), { now: clock() });
  s.save(snap({ sq: [1] }));
  const remote = fakeRemote({ p2: { ...PS.toPayload('Distant', snap({ sq: [9] }), 'd1') } });
  const r = await PS.sync(s, remote);
  assert.deepEqual([r.refresh, r.pushed, r.conflicts], [true, 1, 0]);
  assert.deepEqual(remote.docs.default.sq, [1]);
  assert.equal(s.name('p2'), 'Distant'); assert.deepEqual(s.load('p2').sq, [9]);
  assert.equal(s.syncBase('default'), remote.docs.default.savedAt);
  const again = await PS.sync(s, remote);
  assert.deepEqual([again.refresh, again.pushed, again.conflicts], [false, 0, 0], 'rien à faire la deuxième fois');
});

test('synchro : un changement d’un seul côté est repris par l’autre', async () => {
  const s = PS.create(memory(), { now: clock() });
  s.save(snap({ sq: [1] }));
  const remote = fakeRemote();
  await PS.sync(s, remote);
  remote.docs.default = { ...remote.docs.default, sq: [1, 2], savedAt: 'plus-tard' };      // changé ailleurs
  const r1 = await PS.sync(s, remote);
  assert.equal(r1.refresh, true); assert.deepEqual(s.load().sq, [1, 2]);
  s.save(snap({ sq: [1, 2, 3] }));                                                           // changé ici
  const r2 = await PS.sync(s, remote);
  assert.equal(r2.pushed, 1); assert.deepEqual(remote.docs.default.sq, [1, 2, 3]);
});

test('synchro : changé des deux côtés → fusion si on confirme, sinon le conflit reste en attente', async () => {
  const make = async () => {
    const s = PS.create(memory(), { now: clock() }); s.save(snap({ sq: [1] }));
    const remote = fakeRemote(); await PS.sync(s, remote);
    s.save(snap({ sq: [1, 50] }));
    remote.docs.default = { ...remote.docs.default, sq: [1, 777], savedAt: 'ailleurs' };
    return { s, remote };
  };
  let { s, remote } = await make();
  const auto = await PS.sync(s, remote, { manual: false, confirmMerge: async () => true });
  assert.equal(auto.conflicts, 1, 'en arrière-plan, on ne fusionne jamais sans demander');
  assert.deepEqual(s.load().sq, [1, 50]);
  const refus = await PS.sync(s, remote, { manual: true, confirmMerge: async () => false });
  assert.equal(refus.conflicts, 1);
  let demande = null;
  const ok = await PS.sync(s, remote, { manual: true, confirmMerge: async nom => { demande = nom; return true; } });
  assert.equal(demande, 'Défaut');
  assert.deepEqual([ok.refresh, ok.pushed, ok.conflicts], [true, 1, 0]);
  assert.deepEqual(s.load().sq.sort((a, b) => a - b), [1, 50, 777]);
  assert.deepEqual(remote.docs.default.sq.sort((a, b) => a - b), [1, 50, 777]);
  ({ s, remote } = await make());
  remote.docs.default = { ...PS.toPayload('Défaut', s.load(), 'ailleurs') };               // même contenu, dates différentes
  const same = await PS.sync(s, remote, { manual: false });
  assert.equal(same.conflicts, 0, 'même contenu : pas de conflit');
});

test("export / import : le fichier garde son format ; l'import ajoute sans rien retirer et écarte l'inconnu", () => {
  const a = snap({ sdone: [1], sq: [2, 3], sodone: [4], sLevel: 130, sdzState: { 10: 'owned' }, sdzGoals: [11], rwGoals: ['t5', 'o6'], qState: { 2: 's' } });
  const f = PS.exportFile(a, 'Moi', '2026-11-06T00:00:00.000Z');
  assert.equal(f.format, 'succes-dofus-coches'); assert.equal(f.version, 2); assert.equal(f.niveau, 130);
  assert.deepEqual(f.succesQuetes, [2, 3]); assert.deepEqual(f.succesQuetesEtat, { 2: 's' });
  assert.deepEqual(PS.inspectImport(f), { count: 4, hasDofus: true, profil: 'Moi' });
  assert.equal(PS.inspectImport({ format: 'autre' }).count, 0);
  const known = { dofus: id => String(id) === '10' || String(id) === '99', quest: id => String(id) !== '404', reward: k => k !== 'o6' };
  const base = snap({ sq: [9], sdzState: { 99: 'missing' }, qState: { 7: 'b' } });
  const imp = PS.importInto(base, { ...f, succesDofusEtat: { 10: 'owned', 55: 'owned', 99: 'weird' }, succesQuetesEtat: { 2: 's', 404: 's', 8: 'x' }, succesDofusObjectifs: [11, 99] }, known);
  assert.deepEqual(imp.sq.sort((x, y) => x - y), [2, 3, 9]);
  assert.deepEqual(imp.sdzState, { 99: 'missing', 10: 'owned' });
  assert.deepEqual(imp.qState, { 7: 'b', 2: 's' });
  assert.deepEqual(imp.sdzGoals, [99]);
  assert.deepEqual(imp.rwGoals, ['t5'], 'les objectifs titres et ornements sont importés, l’inconnu écarté');
  assert.deepEqual(f.succesRecompensesObjectifs, ['t5', 'o6']);
  assert.deepEqual(base.sq, [9], 'le snapshot d’origine n’est pas modifié');
});

test('la progression prévient de ses modifications, mais pas des chargements ni des simulations', () => {
  const P = Progression.create({ categories: [], succes: [{ id: 1, n: 'A', ob: [1] }], objectifs: { 1: { a: 1, t: 'q', r: 1 } }, quetes: { 1: { n: 'Q', lv: 1 } }, dofus: [] });
  let n = 0; const off = P.subscribe(() => { n++; });
  P.state.sq.add(1); assert.equal(n, 1);
  P.state.sq.add(1); assert.equal(n, 1, 'rien n’a changé');
  P.state.qState[2] = 's'; P.state.level = 50; assert.equal(n, 3);
  P.load({ sq: [1, 2, 3] }); assert.equal(n, 3, 'un chargement est silencieux');
  P.simulate(() => { P.state.sdone.add(1); }); assert.equal(n, 3, 'une simulation aussi');
  assert.equal(P.state.sdone.has(1), false, 'et l’état revient');
  off(); P.state.sq.add(99); assert.equal(n, 3);
});

test('synchro des réglages : le plus récent l’emporte, dans les deux sens, sans toucher aux profils', async () => {
  const a = PS.create(memory(), { now: () => '2026-01-01T10:00:00Z' }), b = PS.create(memory(), { now: () => '2026-01-02T10:00:00Z' });
  const remote = fakeRemote();
  a.setSyncedPref('swipeR', 'blocked');
  let r = await PS.sync(a, remote);
  assert.equal(remote.docs.__prefs.v.swipeR, 'blocked'); assert.equal(Object.keys(remote.docs).filter(k => k !== '__prefs').length, 1);
  r = await PS.sync(b, remote);   // l'autre appareil reçoit
  assert.equal(b.pref('swipeR', ''), 'blocked'); assert.equal(r.refresh, true);
  b.setSyncedPref('swipeR', 'done');   // modifié plus tard : repart vers le distant puis revient sur le premier appareil
  await PS.sync(b, remote); await PS.sync(a, remote);
  assert.equal(a.pref('swipeR', ''), 'done');
  assert.ok(!a.profiles().some(p => p.id === '__prefs'), 'les réglages ne sont pas pris pour un profil');
});
