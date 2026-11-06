// Tests des adresses de la page : node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Route = require('../src/route.js');

test('une vue avec catégorie et sélection s’écrit et se relit à l’identique', () => {
  const cas = [
    [{ view: 'quetes', cat: '40', dj: null, item: { k: 'q', id: 219 } }, '#/quetes/40/q219'],
    [{ view: 'succes', cat: 'tous', dj: null, item: { k: 'a', id: 8855 } }, '#/succes/tous/a8855'],
    [{ view: 'donjons', cat: null, dj: 7, item: { k: 'q', id: 12 } }, '#/donjons/7/q12'],
    [{ view: 'quetes', cat: 'objectifs', dj: null, item: null }, '#/quetes/objectifs'],
    [{ view: 'dofus', cat: null, dj: null, item: null }, '#/dofus'],
    [{ view: 'reglages', cat: null, dj: null, item: null }, '#/reglages'],
  ];
  for (const [state, hash] of cas) { assert.equal(Route.format(state), hash); assert.deepEqual(Route.parse(hash), state); }
});

test('les parties qui n’ont pas de sens pour une vue sont ignorées à l’écriture', () => {
  assert.equal(Route.format({ view: 'dofus', cat: '40', dj: 3, item: { k: 'q', id: 1 } }), '#/dofus');
  assert.equal(Route.format({ view: 'donjons', cat: '40', dj: 3, item: null }), '#/donjons/3');
  assert.equal(Route.format({ view: 'quetes', cat: null, item: { k: 'x', id: 1 } }), '#/quetes');
});

test('une adresse inconnue ou abîmée ne donne rien ou une vue sans extras', () => {
  assert.equal(Route.parse(''), null);
  assert.equal(Route.parse('#'), null);
  assert.equal(Route.parse('#/inconnue/1'), null);
  assert.equal(Route.parse('#quetes'), null, 'ancien format sans barre : non reconnu');
  assert.deepEqual(Route.parse('#/quetes/n-importe-quoi/q5'), { view: 'quetes', cat: null, dj: null, item: null }, 'catégorie invalide : ignorée, et la suite aussi');
  assert.deepEqual(Route.parse('#/quetes/40/zzz'), { view: 'quetes', cat: '40', dj: null, item: null });
  assert.equal(Route.format(null), '#/quetes');
});

test('la base d’une adresse est l’adresse sans la sélection', () => {
  assert.equal(Route.base('#/quetes/40/q219'), '#/quetes/40');
  assert.equal(Route.base('#/quetes/40'), '#/quetes/40');
  assert.equal(Route.base('#/donjons/7/q12'), '#/donjons/7');
  assert.equal(Route.base(''), '');
});
