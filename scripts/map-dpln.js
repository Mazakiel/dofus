// Associe nos donjons, quêtes et succès à leur page du site « Dofus pour les Noobs » (une page par donjon, par quête et par succès).
// Usage : node scripts/map-dpln.js data/dofusdb.json data/dpln-links.json   (réécrit le fichier de liens ; à relancer après une mise à jour des données)
// Source : le plan du site (sitemap.xml, un seul téléchargement) : l'adresse d'une page est son titre. Les pages sont rapprochées par le nom.
// Ce que la déduction ne trouve pas se règle à la main dans data/dpln-fixes.json (adresse par identifiant) ; sans page, aucun lien n'est affiché.
const fs = require('fs'), path = require('path');
const SITE = 'https://www.dofuspourlesnoobs.com';

// Clés de rapprochement. Le site écrit ses adresses avec des accents mal encodés (« xeacutelorium », « quecirctes ») et traite les
// apostrophes tantôt comme un tiret (« l-effet-dragon »), tantôt en les supprimant (« losmose ») : un nom donne donc deux clés.
const ascii = s => s.toLowerCase().replace(/œ/g, 'oe').replace(/[’‘]/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = s => s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const keysOfName = n => { const a = ascii(n); return [...new Set([slug(a.replace(/'/g, '-')), slug(a.replace(/'/g, ''))])]; };
const keyOfUrl = u => slug(u.replace(/^\//, '').replace(/\.html$/, '').replace(/([aeiouc])(acute|grave|circ|uml|cedil|tilde)/g, '$1').replace(/rsquo/g, '').replace(/oelig/g, 'oe'));

function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]+\.html)<\/loc>/g)].map(m => m[1]);
}
function siteIndex(urls) {
  const idx = new Map();
  for (const u of urls) { const k = keyOfUrl(u); if (!idx.has(k)) idx.set(k, u); }
  return idx;
}
const findPage = (idx, name) => { for (const k of keysOfName(name)) if (idx.has(k)) return idx.get(k); return null; };

// quêtes et succès : page du même nom ; fixes : { quetes: { id: adresse }, succes: {...}, donjons: {...} }
function mapPages(idx, data, fixes = {}) {
  const quetes = {}, succes = {};
  for (const [id, q] of Object.entries(data.quetes)) { const u = (fixes.quetes || {})[id] || findPage(idx, q.n); if (u) quetes[id] = u; }
  for (const a of data.succes) { const u = (fixes.succes || {})[a.id] || findPage(idx, a.n); if (u) succes[a.id] = u; }
  return { quetes, succes };
}

async function run(dataFile, outFile) {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const fixFile = path.join(path.dirname(outFile), 'dpln-fixes.json'), fixes = fs.existsSync(fixFile) ? JSON.parse(fs.readFileSync(fixFile, 'utf8')) : {};
  const get = async p => { const r = await fetch(SITE + p, { headers: { 'User-Agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error(p + ' ' + r.status); return r.text(); };
  const urls = parseSitemap(await get('/sitemap.xml')), idx = siteIndex(urls);
  // donjons : d'abord les pages de la liste des donjons du site (évite de confondre avec une quête du même nom), puis tout le site
  const hub = new Set([...(await get('/donjons.html')).matchAll(/href="(\/[^"#]+\.html)"/g)].map(m => m[1]));
  const hubIdx = siteIndex(urls.filter(u => hub.has(u))), donjons = {}, miss = [];
  for (const [id, d] of Object.entries(data.donjons)) { const u = (fixes.donjons || {})[id] || findPage(hubIdx, d.n) || findPage(idx, d.n); if (u) donjons[id] = u; else miss.push(`${id} ${d.n}`); }
  const { quetes, succes } = mapPages(idx, data, fixes);
  fs.writeFileSync(outFile, JSON.stringify({ site: SITE, donjons, succes, quetes }) + '\n');
  console.log(`${Object.keys(donjons).length} / ${Object.keys(data.donjons).length} donjons · ${Object.keys(quetes).length} / ${Object.keys(data.quetes).length} quêtes · ${Object.keys(succes).length} succès liés`);
  if (miss.length) console.log('donjons sans page :', miss.join(' | '));
  const noq = Object.keys(data.quetes).filter(id => !quetes[id]).map(id => `${id} ${data.quetes[id].n}`);
  if (noq.length) console.log(`${noq.length} quêtes sans page (à corriger dans data/dpln-fixes.json si elles existent) :`, noq.slice(0, 15).join(' | ') + (noq.length > 15 ? ' …' : ''));
}
module.exports = { run, parseSitemap, siteIndex, keysOfName, keyOfUrl, findPage, mapPages };
if (require.main === module) run(process.argv[2] || 'data/dofusdb.json', process.argv[3] || 'data/dpln-links.json').catch(e => { console.error(e); process.exit(1); });
