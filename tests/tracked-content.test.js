// Tests de la règle « ce qui est suivi » (scripts/lib/tracked-content.js) : node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { trackedContent } = require('../scripts/lib/tracked-content.js');

// Quêtes (8) : zones 20 et 21, plus « Général » 118 ; Événements (9) : Vulkania 60 (saisonnier) ; Divers (50) : hors périmètre.
const DATA = () => ({
  categories: [
    { id: 8, p: 0, o: 1, n: 'Quêtes' }, { id: 20, p: 8, o: 2, n: 'Zone A' }, { id: 21, p: 8, o: 1, n: 'Zone B' }, { id: 118, p: 8, o: 3, n: 'Général' },
    { id: 9, p: 0, o: 2, n: 'Événements' }, { id: 60, p: 9, o: 1, n: 'Vulkania' }, { id: 50, p: 0, o: 3, n: 'Divers' }, { id: 61, p: 50, o: 1, n: 'Autre' },
  ],
  succes: [
    { id: 1, c: 20, ob: [1] }, { id: 2, c: 21, ob: [] }, { id: 3, c: 118, ob: [3] }, { id: 4, c: 61, ob: [] },
    { id: 5, c: 60, ob: [5] }, { id: 6, c: 50, ob: [] },
  ],
  objectifs: { 1: { a: 1, t: 'q', r: 1 }, 3: { a: 3, t: 'q', r: 5 }, 5: { a: 5, t: 'q', r: 2 } },
  quetes: { 1: { n: 'Q1' }, 2: { n: 'Q2' }, 3: { n: 'Q3', ev: 1 }, 4: { n: 'Q4' }, 5: { n: 'Q5', preA: [4] } },
  dofus: [{ id: 10, n: 'D10', a: 5 }, { id: 20833, n: 'Cacao' }, { id: 12, n: 'D12', a: 1 }],
});

test('les succès suivis sont ceux de Quêtes et Événements (hors « Général ») qui ont un lien avec les quêtes', () => {
  const L = trackedContent(DATA());
  const tracked = L.succes.filter(a => a.t).map(a => a.id).sort();
  assert.deepEqual(tracked, [1, 2, 5]);                                   // 3 est dans « Général », 4 et 6 hors périmètre
  assert.deepEqual(L.succes.map(a => a.id).sort(), [1, 2, 4, 5], 'élagage : 4 est gardé car une quête l\'exige ; 3 (Général) et 6 sont retirés');
});

test('le menu suit l’ordre des catégories et regroupe les Événements', () => {
  const L = trackedContent(DATA());
  assert.deepEqual(L.menu.map(m => m.id), [21, 20, 9]);
  assert.deepEqual(L.menu.map(m => m.n), ['Zone B', 'Zone A', 'Événements']);
  assert.deepEqual(L.menu[2].cats, [9, 60]);
  assert.ok(!L.menu.some(m => m.id === 118), '« Général » n’est pas une entrée');
});

test('le contenu saisonnier est marqué : catégories, quêtes et Dofus', () => {
  const L = trackedContent(DATA());
  assert.deepEqual(L.categories.filter(c => c.s).map(c => c.id), [60]);
  const seasonalQuests = Object.entries(L.quetes).filter(([, q]) => q.s).map(([id]) => +id).sort();
  assert.deepEqual(seasonalQuests, [2, 3], 'Q2 n’est demandée que par un succès saisonnier, Q3 est un événement sans succès');
  assert.deepEqual(L.dofus.filter(d => d.s).map(d => d.id).sort(), [10, 20833]);
});

test('les données d’origine ne sont pas modifiées', () => {
  const D = DATA(), copie = JSON.stringify(D);
  trackedContent(D);
  assert.equal(JSON.stringify(D), copie);
});

test('sur les données figées : la règle donne les mêmes effectifs que la page avant l’extraction', { skip: !fs.existsSync(path.join(__dirname, 'fixtures', 'dofusdb.json')) }, () => {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'dofusdb.json'), 'utf8'));
  const L = trackedContent(D);
  assert.equal(L.succes.length, 434);
  assert.equal(L.succes.filter(a => a.t).length, 282);
  const seasonal = new Set(L.categories.filter(c => c.s).map(c => c.id));
  assert.equal(L.succes.filter(a => a.t && !seasonal.has(a.c)).length, 271, 'les 271 succès de quêtes affichés par défaut');
  const catsMenu = new Set(L.menu.flatMap(m => m.cats));
  assert.ok(L.succes.filter(a => a.t).every(a => catsMenu.has(a.c)), 'chaque succès suivi est rangé sous une entrée du menu');
  assert.equal(new Set(L.menu.map(m => m.id)).size, L.menu.length);
  assert.equal(Object.keys(L.quetes).length, Object.keys(D.quetes).length);
});
