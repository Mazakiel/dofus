// Tests du module de règles de progression : node --test tests/
// Ils passent par l'interface du module, sans page ni navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Progression = require('../src/progression.js');

// Petit jeu de données : A1 = quêtes 1 et 2 ; A2 = sous-succès A1 + un objectif libre ; A3 = niveau 50.
// Q2 exige Q1, Q3 exige le succès A1, Q4 exige le Dofus 100, Q5 est une quête de niveau 60.
const DATA = () => ({
  categories: [],
  succes: [
    { id: 1, n: 'A1', ob: [10, 11] },
    { id: 2, n: 'A2', ob: [12, 13] },
    { id: 3, n: 'A3', ob: [14] },
    { id: 4, n: 'A4', ob: [] },
  ],
  objectifs: {
    10: { a: 1, t: 'q', r: 1 }, 11: { a: 1, t: 'q', r: 2 },
    12: { a: 2, t: 'a', r: 1 }, 13: { a: 2, t: 'x', n: 'Vaincre X' },
    14: { a: 3, t: 'lvl', r: 50 },
  },
  quetes: {
    1: { n: 'Q1', lv: 10 }, 2: { n: 'Q2', lv: 10, pre: [1] }, 3: { n: 'Q3', lv: 20, preA: [1] },
    4: { n: 'Q4', lv: 20, preD: [100] }, 5: { n: 'Q5', lv: 60 },
  },
  dofus: [
    { id: 100, n: 'Dofus Test', a: 2 },
    { id: 101, n: 'Dofus Quête', q: 5 },
    { id: 102, n: 'Dofus Manuel', pre: 1, pa: [3] },
  ],
});
const make = () => { const P = Progression.create(DATA()); P.load({ sLevel: 100 }); return P; };

test('une quête est faite si cochée, ou si le succès qui la contient est obtenu', () => {
  const P = make();
  assert.equal(P.questDone(1), false);
  P.state.sq.add(1);
  assert.equal(P.questDone(1), true);
  P.state.sdone.add(1);                      // le succès A1 contient Q1 et Q2
  assert.equal(P.questDone(2), true);
});

test('un succès est obtenu quand tous ses objectifs le sont, sous-succès compris', () => {
  const P = make();
  P.state.sq.add(1); P.state.sq.add(2);
  assert.equal(P.achDone(1), true);
  assert.equal(P.achDone(2), false);         // il reste l'objectif libre
  P.state.sodone.add(13);
  assert.equal(P.achDone(2), true);
  assert.deepEqual(P.achProg({ ob: [12, 13] }), [2, 2]);
});

test("les caches s'invalident d'eux-mêmes : aucune remise à zéro à faire après une modification", () => {
  const P = make();
  assert.equal(P.achDone(1), false);         // mis en cache
  P.state.sq.add(1); P.state.sq.add(2);
  assert.equal(P.achDone(1), true);
  P.state.sq.delete(2);
  assert.equal(P.achDone(1), false);
  assert.equal(P.achDone(3), true);          // niveau 100 ≥ 50
  P.state.level = 10;
  assert.equal(P.achDone(3), false);
  assert.equal(P.achAvailable(3), false);
  P.state.level = 50;
  assert.equal(P.achAvailable(3) || P.achDone(3), true);
  P.state.sdzState[100] = 'owned';           // objet suivi : une écriture invalide aussi
  assert.equal(P.questAvailable(4), true);
});

test("la disponibilité d'une quête tient compte du niveau, des quêtes, des succès et des Dofus exigés", () => {
  const P = make();
  P.state.level = 5;
  assert.equal(P.questAvailable(1), false);  // niveau 10 requis
  P.state.level = 100;
  assert.equal(P.questAvailable(1), true);
  assert.equal(P.questAvailable(2), false);  // exige Q1
  assert.equal(P.questAvailable(3), false);  // exige le succès A1
  assert.equal(P.questAvailable(4), false);  // exige le Dofus 100
  P.state.sq.add(1); P.state.sq.add(2);
  assert.equal(P.questAvailable(3), true);
  P.state.sdzState[100] = 'owned';
  assert.equal(P.questAvailable(4), true);
});

test('statut : faite > bloquée > commencée > disponible > indisponible', () => {
  const P = make();
  assert.equal(P.questStatus(2), 'lock');
  assert.equal(P.questStatus(1), 'av');
  P.state.qState[1] = 's'; assert.equal(P.questStatus(1), 'st');
  P.state.qState[1] = 'b'; assert.equal(P.questStatus(1), 'bl');
  P.state.sq.add(1);        assert.equal(P.questStatus(1), 'done');
  P.state.qState[2] = 's';  assert.equal(P.questStatus(2), 'st');   // marquée à la main, même indisponible
});

test('les raisons de blocage nomment ce qui manque', () => {
  const P = make();
  P.state.level = 5;
  assert.deepEqual(P.lockReasons(2), ['niveau 10 requis', 'quête « Q1 »']);
  assert.deepEqual(P.lockReasons(4), ['niveau 20 requis', 'posséder le Dofus Test']);
});

test("l'affichage suit les cases « obtenus » et « indisponibles »", () => {
  const P = make();
  const off = { showDone: false, showLocked: false }, all = { showDone: true, showLocked: true };
  assert.equal(P.questShown(1, off), true);          // disponible
  assert.equal(P.questShown(2, off), false);         // indisponible
  assert.equal(P.questShown(2, all), true);
  P.state.qState[2] = 'b';
  assert.equal(P.questShown(2, off), true);          // marquée à la main : toujours visible
  P.state.sq.add(1);
  assert.equal(P.questShown(1, off), false);         // faite, masquée
  assert.equal(P.questShown(1, all), true);
  assert.equal(P.achShown(1, off), true);            // A1 pas finie, mais Q2 est faisable
  assert.equal(P.achShown(2, off), true);            // A2 exige le sous-succès A1, mais A1 est faisable : A2 l’est en cascade
  assert.equal(P.achShown(2, all), true);
});

test('valider une quête ou un succès liste ses prérequis en cascade', () => {
  const P = make();
  const q3 = P.collectPrereqs('q', 3);
  assert.deepEqual([...q3.a], [1]);
  assert.deepEqual([...q3.q].sort(), [1, 2]);
  const d100 = P.collectPrereqs('d', 100);
  assert.deepEqual([...d100.a].sort(), [1, 2]);
  assert.deepEqual([...d100.q].sort(), [1, 2]);
  assert.deepEqual([...d100.o], [13]);
  P.state.sq.add(1);
  assert.deepEqual([...P.collectPrereqs('q', 3).q], [2]);   // ce qui est fait n'y figure plus
});

test('décocher liste ce qui en dépend, puis le retire', () => {
  const P = make();
  P.load({ sq: [1, 2, 3], sodone: [13], sLevel: 100 });
  assert.equal(P.dofusOwned(P.index.SDZ[100]), true);        // A2 obtenu → Dofus 100 obtenu
  const rm = P.collectDependents('q', 1);
  assert.deepEqual([...rm.q].sort(), [1, 2, 3]);
  assert.deepEqual([...rm.a].sort(), [1, 2]);
  assert.deepEqual([...rm.d], [100]);
  rm.q.add(1);
  P.applyRemoval(rm);
  assert.equal(P.questDone(1), false);
  assert.equal(P.questDone(3), false);
  assert.equal(P.dofusOwned(P.index.SDZ[100]), false);
});

test('un Dofus se déduit de son succès ou de sa quête, et peut être forcé à la main', () => {
  const P = make(), d = P.index.SDZ[101];
  assert.equal(P.dofusOwned(d), false);
  P.state.sdzGoals.add(101);
  P.setDofusOwned(d, true);
  assert.equal(P.state.sdzState[101], 'owned');
  assert.equal(P.state.sdzGoals.has(101), false);            // un Dofus obtenu n'est plus un objectif
  P.setDofusOwned(d, false);
  assert.equal(P.state.sdzState[101], undefined);            // retour à la valeur déduite
  P.state.sq.add(5);
  assert.equal(P.dofusOwned(d), true);
  P.setDofusOwned(d, false);
  assert.equal(P.state.sdzState[101], 'missing');
  const manuel = P.index.SDZ[102];
  P.state.sdone.add(3);
  assert.equal(P.dofusAuto(manuel), false, "un succès seulement prérequis ne suffit pas");
});

test("l'état se sauvegarde et se recharge à l'identique ; simulate remet l'état d'origine", () => {
  const P = make();
  P.load({ sdone: [4], sq: [1, 2], sodone: [13], sLevel: 77, sdzState: { 101: 'owned' }, sdzGoals: [100], rwGoals: ['t7'], qState: { 5: 's' } });
  const snap = P.snapshot();
  assert.deepEqual(snap, { sdone: [4], sq: [1, 2], sodone: [13], sLevel: 77, sdzState: { 101: 'owned' }, sdzGoals: [100], rwGoals: ['t7'], qState: { 5: 's' } });
  const Q = Progression.create(DATA()); Q.load(snap);
  assert.deepEqual(Q.snapshot(), snap);
  const vu = P.simulate(() => { P.state.sq.add(3); P.state.sdone.add(1); return P.achDone(1); });
  assert.equal(vu, true);
  assert.deepEqual(P.snapshot(), snap);
  assert.equal(P.achDone(1), true);                          // A1 : Q1 et Q2 faites avant la simulation
});

test('les quêtes et succès qui servent des Dofus visés sont retrouvés', () => {
  const P = make();
  const { q, a } = P.goalsFor([P.index.SDZ[100]]);
  assert.deepEqual(Object.keys(q).sort(), ['1', '2']);
  assert.deepEqual(Object.keys(a).sort(), ['1', '2']);
  assert.equal(q[1][0].id, 100);
});

test('un titre ou un ornement est obtenu avec son succès, et un objectif en déduit ce qui reste', () => {
  const D = DATA();
  D.succes[0].ti = [{ id: 7, n: 'Titre A1' }]; D.succes[1].or = [{ id: 8, n: 'Ornement A2', i: 3 }];
  const P = Progression.create(D); P.load({ sLevel: 100 });
  const [t, o] = [P.index.RWBY.t[7], P.index.RWBY.o[8]];
  assert.deepEqual([t.kind, t.a, o.kind, o.a, o.i], ['t', 1, 'o', 2, 3]);
  assert.equal(P.index.RW.length, 2);
  assert.equal(P.rewardOwned(t), false);
  const g = P.goalsFor([t, o]);                              // A1 = Q1 + Q2 ; A2 = A1 + un objectif libre
  assert.deepEqual(Object.keys(g.q).sort(), ['1', '2']);
  assert.deepEqual(Object.keys(g.a).sort(), ['1', '2']);     // le succès qui donne la récompense compte aussi
  assert.deepEqual(g.a[1].map(r => r.kind).sort(), ['o', 't']);
  P.state.sq.add(1); P.state.sq.add(2);                      // A1 obtenu : le titre aussi
  assert.equal(P.rewardOwned(t), true);
  assert.equal(P.rewardOwned(o), false);
  assert.deepEqual(Object.keys(P.goalsFor([o]).q), [], 'plus de quête à faire pour l’ornement');
  assert.deepEqual(Object.keys(P.goalsFor([o]).a), ['2']);
  P.state.rwGoals.add('t7');
  assert.deepEqual(P.snapshot().rwGoals, ['t7']);
});

test('un objectif coché à la main, devenu une quête, rend la quête faite', () => {
  const P = make();
  P.load({ sodone: [10, 13], sLevel: 100 });                 // 10 est l'objectif « quête 1 » : il était libre avant d'être relié
  assert.equal(P.questDone(1), true);
  assert.deepEqual(P.snapshot().sodone, [13], 'la coche d’objectif est reprise par la quête');
  assert.deepEqual(P.snapshot().sq, [1]);
});

test('suggestions : seulement ce qui se fait maintenant, classé par un score dont on voit les raisons', () => {
  const P = make(); P.load({ sLevel: 100 });
  const ids = list => list.map(x => x.id).sort((x, y) => x - y);
  assert.ok(P.suggest().every(x => x.k === 'q'), 'des quêtes seulement');
  assert.deepEqual(ids(P.suggest()), [1, 5], 'Q2, Q3, Q4 ne sont pas faisables : pas proposées');
  P.load({ sLevel: 100, qState: { 1: 'b' } });
  assert.deepEqual(ids(P.suggest()), [5], 'une quête marquée bloquée n’est jamais proposée');
  P.load({ sLevel: 100, sq: [5] });
  assert.deepEqual(ids(P.suggest()), [1], 'ni une quête faite');
  P.load({ sLevel: 100 });
  const q1 = P.suggest().find(x => x.id === 1);
  const un = q1.reasons.find(r => r.t === 'unlock');
  assert.equal(un.n, 2, 'Q1 ouvre Q2 (directement) et Q3 (par le succès A1)');
  assert.ok(q1.reasons.some(r => r.t === 'progress' && r.ach === 'A1' && r.n === 2));
});

test('suggestions : objectif, quête commencée, dernière quête d’un succès et récompenses font monter le score', () => {
  const D = DATA(); D.succes[0].ti = [{ id: 7, n: 'Titre A1' }];
  const P = Progression.create(D); P.load({ sLevel: 100 });
  const top = o => P.suggest(o)[0];
  assert.equal(top({ goalQ: { 5: [{ n: 'Dofus visé', id: 100 }] } }).id, 5, 'un objectif passe devant');
  assert.equal(top({ goalQ: { 5: [{ n: 'Dofus visé' }] } }).reasons[0].t, 'goal');
  P.load({ sLevel: 100, qState: { 5: 's' } });
  const started = P.suggest().find(x => x.id === 5);
  assert.ok(started.reasons.some(r => r.t === 'started'));
  P.load({ sLevel: 100, sq: [1] });                          // Q2 est la dernière quête de A1, qui donne un titre
  const q2 = P.suggest().find(x => x.id === 2);
  assert.ok(q2.reasons.some(r => r.t === 'completes' && r.ach === 'A1'));
  assert.ok(q2.reasons.some(r => r.t === 'reward' && r.items[0].n === 'Titre A1'));
  assert.equal(P.suggest()[0].id, 2, 'terminer un succès qui rapporte un titre passe en tête');
  assert.ok(P.suggest({ preset: 'rewards' }).find(x => x.id === 2).score > q2.score, 'le préréglage Récompenses pèse plus sur le titre');
});

test('suggestions : un même succès ne remplit pas toute la liste', () => {
  const D = { categories: [], succes: [{ id: 1, n: 'Gros succès', ob: [10, 11, 12, 13, 14] }, { id: 2, n: 'Autre', ob: [20] }], objectifs: {}, quetes: {}, dofus: [] };
  [1, 2, 3, 4, 5].forEach((q, i) => { D.quetes[q] = { n: 'Q' + q, lv: 10 }; D.objectifs[10 + i] = { a: 1, t: 'q', r: q }; });
  D.quetes[6] = { n: 'Q6', lv: 10 }; D.objectifs[20] = { a: 2, t: 'q', r: 6 };
  const P = Progression.create(D); P.load({ sLevel: 100 });
  const ids = P.suggest({ limit: 6 }).map(x => x.id);
  assert.equal(ids.indexOf(6) < 3, true, 'la quête de l’autre succès remonte devant les quêtes en trop du premier');
});

test('un Dofus à acheter à un PNJ demande ses succès et ses quêtes prérequis (pa, pq)', () => {
  const D = DATA(); D.dofus.push({ id: 200, n: 'Dofus Acheté', pre: 1, pa: [2], pq: [5] });
  const P = Progression.create(D); P.load({ sLevel: 100 });
  const acc = P.collectPrereqs('d', 200);
  assert.deepEqual([...acc.a].sort(), [1, 2], 'le succès prérequis et son sous-succès');
  assert.ok(acc.q.has(5), 'la quête prérequise');
  P.state.sq.add(5);
  assert.equal(P.collectPrereqs('d', 200).q.has(5), false, 'faite : elle ne figure plus');
  assert.ok(P.collectDependents('q', 5).d.has(200) === false, 'tant que le Dofus n’est pas obtenu, rien à décocher');
});

test('un méta-succès est faisable dès qu\'un de ses sous-succès l\'est, même s\'il n\'est pas « disponible »', () => {
  const P = make(); P.load({ sLevel: 100 });
  assert.equal(P.achAvailable(2), false, 'A2 exige le sous-succès A1 : indisponible');
  assert.equal(P.achDoable(2), true, 'mais A1 est faisable : on peut y travailler');
  P.load({ sLevel: 5 });
  assert.equal(P.achDoable(2), false, 'rien de faisable dessous (niveau trop bas) : indisponible aussi');
  P.load({ sLevel: 100, sq: [1, 2], sodone: [13] });
  assert.equal(P.achDoable(2), false, 'obtenu : plus à faire');
});

test('sur les données figées : cohérence et temps de calcul', { skip: !fs.existsSync(path.join(__dirname, 'fixtures', 'dofusdb.json')) }, () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'dofusdb.json'), 'utf8'));
  const P = Progression.create(data);
  const qids = Object.keys(data.quetes).map(Number);
  const t0 = Date.now();
  const status = qids.map(id => P.questStatus(id));
  assert.ok(Date.now() - t0 < 2000, 'statut de toutes les quêtes en moins de 2 s');
  assert.ok(status.includes('av') && status.includes('lock'));
  P.load({ sq: qids, sLevel: 200 });
  assert.ok(qids.every(id => P.questStatus(id) === 'done'), 'tout cocher donne partout « faite »');
  // valider les prérequis d'un Dofus le rend obtenu (hors Dofus à cocher à la main)
  for (const d of data.dofus.filter(d => (d.a || d.q) && !d.pre && !d.cadeau)) {
    P.load({ sLevel: 200 });
    const acc = P.collectPrereqs('d', d.id);
    acc.a.forEach(x => P.state.sdone.add(x)); acc.q.forEach(x => P.state.sq.add(x)); acc.o.forEach(x => P.state.sodone.add(x));
    assert.equal(P.dofusAuto(d), true, `${d.n} obtenu après validation de ses prérequis`);
  }
});
