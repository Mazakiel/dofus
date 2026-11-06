// Client de l'API DofusDB : ce que les scripts de données savent de l'API vit ici, une seule fois.
//   - l'API plafonne à 50 résultats par page, quel que soit $limit (oublié une fois : 137 donjons manquaient en silence) ;
//   - les requêtes échouent parfois : reprises avec attente croissante ;
//   - tout est mis en cache sur disque (cache/), pour ne retélécharger que ce qui manque.
// L'adapter réseau (`fetchFn`) et les pauses sont injectables : les tests l'utilisent avec une fausse API, sans réseau.
const fs = require('fs'), path = require('path');

const API = 'https://api.dofusdb.fr/';
const PAGE = 50;
const sleepMs = ms => new Promise(r => setTimeout(r, ms));
const selectQuery = select => select.map(s => `$select[]=${s}`).join('&');

function createClient({ cacheDir = process.env.DOFUSDB_CACHE || path.join(__dirname, '..', '..', 'cache'), fetchFn = globalThis.fetch,
  pause = sleepMs, retries = 4, retryDelay = 1500, log = s => process.stderr.write(s) } = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = name => path.join(cacheDir, name);
  const cache = {
    has: name => fs.existsSync(file(name)),
    read: name => JSON.parse(fs.readFileSync(file(name), 'utf8')),
    write: (name, value) => fs.writeFileSync(file(name), JSON.stringify(value)),
  };

  // GET d'un chemin d'API avec sa chaîne de requête (ex. « quests?id=1&$limit=1 »), avec reprises
  async function get(pathAndQuery) {
    for (let t = 0; t < retries; t++) {
      try { const r = await fetchFn(API + pathAndQuery); if (!r.ok) throw new Error(r.status); return await r.json(); }
      catch (e) { log(`\nretry ${pathAndQuery.slice(0, 80)} ${e.message}`); await pause(retryDelay * (t + 1)); }
    }
    throw new Error('échec ' + pathAndQuery);
  }
  // Rend la valeur en cache, ou la construit puis la met en cache
  async function cached(name, build) {
    if (cache.has(name)) return cache.read(name);
    const value = await build(); cache.write(name, value); return value;
  }
  // Tout un point d'accès, page par page, trié par id, avec cache disque (all-<point>.json)
  const all = (endpoint, select) => cached(`all-${endpoint}.json`, async () => {
    const sel = selectQuery(select), page = skip => get(`${endpoint}?$limit=${PAGE}&$skip=${skip}&$sort[id]=1&${sel}`);
    const first = await page(0), out = [...first.data];
    for (let skip = PAGE; skip < first.total; skip += PAGE) {
      out.push(...(await page(skip)).data);
      log(`\r${endpoint} ${out.length}/${first.total}`); await pause(150);
    }
    log('\n');
    return out;
  });
  // Les éléments d'un point d'accès pour une liste d'identifiants, par paquets (id[$in]) ; rend { id: élément }
  // `onChunk(éléments, identifiants)` est appelé après chaque paquet (cache par élément qui reprend là où l'on s'est arrêté)
  async function byIds(endpoint, ids, select, { chunk = 40, wait = 120, onChunk = null } = {}) {
    const out = {}, sel = selectQuery(select);
    for (let i = 0; i < ids.length; i += chunk) {
      const part = ids.slice(i, i + chunk);
      const j = await get(`${endpoint}?${[part.map(id => `id[$in][]=${id}`).join('&'), `$limit=${PAGE}`, sel].filter(Boolean).join('&')}`);
      const got = {}; for (const d of j.data) { out[d.id] = d; got[d.id] = d; }
      if (onChunk) onChunk(got, part);
      log(`\r${endpoint} ${Math.min(i + chunk, ids.length)}/${ids.length}`); await pause(wait);
    }
    log('\n');
    return out;
  }
  return { get, all, byIds, cached, cache, pause };
}

module.exports = { createClient, API, PAGE };
