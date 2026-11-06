// Tests du client DofusDB et de la lecture des critères : fausse API, sans réseau.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('../scripts/lib/dofusdb.js');
const { parseStart, parseObjective } = require('../scripts/lib/criteria.js');

// Fausse API : 120 éléments, plafond de 50 par page quel que soit $limit (comme la vraie), filtre id[$in][].
const ITEMS = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, name: { fr: 'Élément ' + (i + 1) } }));
function fakeApi({ failFirst = 0 } = {}) {
  const calls = []; let failed = 0;
  const fetchFn = async url => {
    calls.push(url);
    if (failed < failFirst) { failed++; return { ok: false, status: 500, json: async () => ({}) }; }
    const q = new URLSearchParams(url.split('?')[1] || '');
    const limit = Math.min(+(q.get('$limit') || 10), 50), skip = +(q.get('$skip') || 0);
    const wanted = q.getAll('id[$in][]').map(Number);
    const pool = wanted.length ? ITEMS.filter(i => wanted.includes(i.id)) : ITEMS;
    return { ok: true, status: 200, json: async () => ({ total: pool.length, limit, skip, data: pool.slice(skip, skip + limit) }) };
  };
  return { fetchFn, calls };
}
const client = opts => createClient({ cacheDir: fs.mkdtempSync(path.join(os.tmpdir(), 'dofusdb-test-')), pause: async () => {}, log: () => {}, ...opts });

test('all() lit toutes les pages malgré le plafond de 50, puis ne retélécharge plus', async () => {
  const api = fakeApi(), c = client({ fetchFn: api.fetchFn });
  const rows = await c.all('items', ['id']);
  assert.equal(rows.length, 120, 'les 120 éléments, pas seulement les 50 premiers');
  assert.equal(api.calls.length, 3);
  assert.ok(api.calls.every(u => /\$limit=50/.test(u)), 'pages de 50');
  assert.deepEqual(rows.map(r => r.id), ITEMS.map(i => i.id));
  const again = await c.all('items', ['id']);
  assert.equal(again.length, 120); assert.equal(api.calls.length, 3, 'servi par le cache');
});

test('byIds() découpe en paquets de 40 et rend { id: élément }', async () => {
  const api = fakeApi(), c = client({ fetchFn: api.fetchFn });
  const seen = [];
  const out = await c.byIds('items', ITEMS.slice(0, 100).map(i => i.id), ['id', 'name'], { onChunk: (got, part) => seen.push(part.length) });
  assert.equal(api.calls.length, 3);
  assert.deepEqual(seen, [40, 40, 20]);
  assert.equal(Object.keys(out).length, 100);
  assert.equal(out[57].name.fr, 'Élément 57');
  assert.ok(!/&$/.test(api.calls[0]), 'pas de « & » en trop sans sélection');
  assert.deepEqual(await c.byIds('items', [], ['id']), {}, 'aucune requête pour une liste vide');
  assert.equal(api.calls.length, 3);
});

test('une requête en échec est reprise, puis abandonnée si ça continue', async () => {
  const waits = [];
  const ok = client({ fetchFn: fakeApi({ failFirst: 2 }).fetchFn, pause: async ms => { waits.push(ms); } });
  assert.equal((await ok.get('items?$limit=1')).data.length, 1);
  assert.deepEqual(waits, [1500, 3000], 'attente croissante');
  const ko = client({ fetchFn: fakeApi({ failFirst: 99 }).fetchFn });
  await assert.rejects(ko.get('items?$limit=1'), /échec/);
});

test('cached() construit une fois, puis relit le cache', async () => {
  const c = client({ fetchFn: fakeApi().fetchFn });
  let n = 0;
  assert.deepEqual(await c.cached('x.json', async () => { n++; return { a: 1 }; }), { a: 1 });
  assert.deepEqual(await c.cached('x.json', async () => { n++; return { a: 2 }; }), { a: 1 });
  assert.equal(n, 1);
});

test('critère d’objectif : quête, succès ou autre', () => {
  assert.deepEqual(parseObjective('Qf=12'), { t: 'q', r: 12 });
  assert.deepEqual(parseObjective('OA=44'), { t: 'a', r: 44 });
  assert.deepEqual(parseObjective('PL>10'), { t: 'x' });
  assert.deepEqual(parseObjective(undefined), { t: 'x' });
});

test('conditions de départ : quêtes, succès, objets ; une alternative n’exige que ce qui est commun', () => {
  assert.deepEqual(parseStart('PL>19&Qf=12&OA=5&PO=300'), { pre: [12], preA: [5], po: [300] });
  assert.deepEqual(parseStart('(Qa=7|Qf=7)&Qf=8'), { pre: [7, 8], preA: [], po: [] }, 'Q7 est dans les deux branches : exigée');
  assert.deepEqual(parseStart('Qf=1|Qf=2').pre, [], 'quêtes différentes dans les alternatives : ignorées');
  assert.deepEqual(parseStart('((Qf=3))&(OA=4)'), { pre: [3], preA: [4], po: [] }, 'parenthèses redondantes retirées');
  assert.deepEqual(parseStart(''), { pre: [], preA: [], po: [] });
});
