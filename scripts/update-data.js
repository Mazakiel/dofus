// Met à jour les données DofusDB en une seule commande : télécharge, puis enrichit, dans l'ordre, avec un même client et un même cache.
// Usage : node scripts/update-data.js data/dofusdb.json      (ou `npm run data`)
// L'ordre compte : l'enrichissement complète le JSON que le téléchargement réécrit.
const { createClient } = require('./lib/dofusdb.js');
const fetchData = require('./fetch-dofusdb.js'), enrich = require('./enrich-dofusdb.js');

(async () => {
  const out = process.argv[2] || 'data/dofusdb.json', client = createClient();
  await fetchData.run(client, out);
  await enrich.run(client, out);
})().catch(e => { console.error(e); process.exit(1); });
