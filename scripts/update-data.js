// Met à jour les données DofusDB en une seule commande : télécharge, puis enrichit, dans l'ordre, avec un même client et un même cache.
// Usage : node scripts/update-data.js data/dofusdb.json      (ou `npm run data`)
// L'ordre compte : l'enrichissement complète le JSON que le téléchargement réécrit.
const { createClient } = require('./lib/dofusdb.js');
const path = require('path');
const fetchData = require('./fetch-dofusdb.js'), enrich = require('./enrich-dofusdb.js'), mapDpln = require('./map-dpln.js');

(async () => {
  const out = process.argv[2] || 'data/dofusdb.json', client = createClient();
  await fetchData.run(client, out);
  await enrich.run(client, out);
  // liens vers Dofus pour les Noobs : un site tiers indisponible ne doit pas faire échouer la mise à jour (les liens précédents sont conservés)
  try { await mapDpln.run(out, path.join(path.dirname(out), 'dpln-links.json')); } catch (e) { console.warn('Liens Dofus pour les Noobs non mis à jour :', e.message); }
})().catch(e => { console.error(e); process.exit(1); });
