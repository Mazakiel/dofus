// Tests de la comparaison des données DofusDB et de la détection d'anomalies (mise à jour automatique).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { diffData, checkData, markdown, title } = require('../scripts/lib/data-diff.js');

const base = () => ({
  genereLe: '2026-11-01',
  categories: [{ id: 1, p: 0, o: 1, n: 'Quêtes' }, { id: 2, p: 1, o: 1, n: 'Zone' }],
  succes: [{ id: 10, c: 2, n: 'A', ob: [100] }, { id: 11, c: 2, n: 'B', ob: [101] }],
  objectifs: { 100: { a: 10, t: 'q', r: 1 }, 101: { a: 11, t: 'q', r: 2 } },
  quetes: { 1: { n: 'Q1', lv: 10, tg: ['cb'] }, 2: { n: 'Q2', lv: 20, pre: [1], tg: ['cb'] } },
  dofus: [{ id: 500, n: 'Dofus X', a: 10 }],
  donjons: { 7: { n: 'Donjon', lv: 30, b: [] } },
});
const clone = o => JSON.parse(JSON.stringify(o));

test('sans changement : rien à signaler, la date seule ne compte pas', () => {
  const a = base(), b = clone(a); b.genereLe = '2026-12-01';
  const d = diffData(a, b);
  assert.equal(d.changed, false);
  assert.equal(d.removals, 0);
  assert.deepEqual(checkData(b, a), []);
});

test('les ajouts sont listés avec leur nom, sans alerte', () => {
  const a = base(), b = clone(a);
  b.quetes[3] = { n: 'Nouvelle quête', lv: 30, tg: ['fm'] };
  b.succes.push({ id: 12, c: 2, n: 'Nouveau succès', ob: [] });
  const d = diffData(a, b);
  assert.equal(d.changed, true); assert.equal(d.removals, 0);
  assert.deepEqual(d.sections.quetes.added, [{ id: '3', name: 'Nouvelle quête' }]);
  assert.deepEqual(d.sections.succes.added, [{ id: '12', name: 'Nouveau succès' }]);
  assert.deepEqual(checkData(b, a), []);
  assert.match(title(d, '2026-11-08'), /^Données DofusDB du 2026-11-08 : \+1 succès, \+1 quêtes$/);
});

test('les retraits sont comptés (ce sont eux qui laissent des coches orphelines)', () => {
  const a = base(), b = clone(a);
  delete b.quetes[2]; b.succes = b.succes.filter(s => s.id !== 11);
  const d = diffData(a, b);
  assert.equal(d.removals, 2);
  assert.deepEqual(d.sections.quetes.removed.map(r => r.id), ['2']);
  assert.match(markdown(d), /Retirés : quêtes[^\n]*orphelines/);
});

test('un prérequis ou un lien modifié est signalé comme notable, un simple renommage non', () => {
  const a = base(), b = clone(a);
  b.quetes[2].pre = [];            // prérequis retiré
  b.quetes[1].n = 'Q1 renommée';   // renommage
  const q = diffData(a, b).sections.quetes.changed;
  assert.equal(q.find(c => c.id === '2').risky, true);
  assert.equal(q.find(c => c.id === '1').risky, false);
});

test('une chute des effectifs, des références cassées ou un enrichissement perdu sont des anomalies', () => {
  const grand = () => { const d = base(); for (let i = 3; i < 60; i++) d.quetes[i] = { n: 'Q' + i, lv: i, tg: ['cb'] }; return d; };
  const a = grand();
  const chute = clone(a); for (let i = 20; i < 60; i++) delete chute.quetes[i];
  assert.ok(checkData(chute, a).some(p => /chute/.test(p)), 'plus de 10 % de quêtes en moins');
  const casse = clone(a); for (let i = 3; i < 40; i++) casse.quetes[i].pre = [9000 + i];
  assert.ok(checkData(casse, a).some(p => /références cassées/.test(p)));
  const sansEnrichissement = clone(a); for (const q of Object.values(sansEnrichissement.quetes)) delete q.tg;
  assert.ok(checkData(sansEnrichissement, a).some(p => /enrichissement/.test(p)));
});

test('une structure vide, des doublons ou une date absente sont des anomalies', () => {
  const a = base();
  const vide = clone(a); vide.quetes = {};
  assert.ok(checkData(vide).some(p => /quetes/.test(p)));
  const doublon = clone(a); doublon.succes.push({ id: 10, c: 2, n: 'A bis', ob: [] });
  assert.ok(checkData(doublon).some(p => /double/.test(p)));
  const sansDate = clone(a); delete sansDate.genereLe;
  assert.ok(checkData(sansDate).some(p => /date/.test(p)));
});

test('sur les données figées : comparées à elles-mêmes, aucun changement ni anomalie', { skip: !fs.existsSync(path.join(__dirname, 'fixtures', 'dofusdb.json')) }, () => {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'dofusdb.json'), 'utf8'));
  assert.equal(diffData(D, D).changed, false);
  assert.deepEqual(checkData(D, D), []);
  const sansDonjons = clone(D); sansDonjons.donjons = {};
  assert.ok(checkData(sansDonjons, D).some(p => /donjons/.test(p)), 'la perte d’une section est détectée sur les vraies données');
});
