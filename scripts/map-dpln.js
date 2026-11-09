// Associe nos donjons à leur page du site « Dofus pour les Noobs » (une page par donjon), d'après la liste du site.
// Usage : node scripts/map-dpln.js data/dofusdb.json data/dpln-links.json   (réécrit le fichier de liens ; à relancer après une mise à jour des données)
// Seuls les donjons trouvés sont écrits : un donjon sans page n'affiche simplement pas de lien.
const fs = require('fs');
const SITE = 'https://www.dofuspourlesnoobs.com';
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// le site écrit ses adresses avec des accents mal encodés (« xeacutelorium », « quecirctes ») : on retire ces suites
const stem = u => norm(u.replace(/^\//, '').replace(/\.html$/, '').replace(/(acute|grave|circ|uml|cedil)/g, '').replace(/-/g, ' '));
const decode = t => t.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '');

async function run(dataFile, outFile) {
  const html = await (await fetch(SITE + '/donjons.html', { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const byText = new Map(), byStem = new Map();
  for (const m of html.matchAll(/<a[^>]+href="(\/[^"#]+\.html)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const t = norm(decode(m[2])); if (t && !byText.has(t)) byText.set(t, m[1]);
    if (!byStem.has(stem(m[1]))) byStem.set(stem(m[1]), m[1]);
  }
  const donjons = JSON.parse(fs.readFileSync(dataFile, 'utf8')).donjons, out = {}, miss = [];
  for (const [id, d] of Object.entries(donjons)) {
    const n = norm(d.n), u = byText.get(n) || byStem.get(n);
    if (u) out[id] = u; else miss.push(`${id} ${d.n}`);
  }
  fs.writeFileSync(outFile, JSON.stringify({ site: SITE, donjons: out }, null, 1) + '\n');
  console.log(`${Object.keys(out).length} / ${Object.keys(donjons).length} donjons liés`, miss.length ? `· sans page : ${miss.join(' | ')}` : '');
}
module.exports = { run };
if (require.main === module) run(process.argv[2] || 'data/dofusdb.json', process.argv[3] || 'data/dpln-links.json').catch(e => { console.error(e); process.exit(1); });
