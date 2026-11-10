// Associe nos donjons à leur page du site « Dofus pour les Noobs » (une page par donjon), d'après la liste du site.
// Usage : node scripts/map-dpln.js data/dofusdb.json data/dpln-links.json   (réécrit le fichier de liens ; à relancer après une mise à jour des données)
// Seuls les donjons trouvés sont écrits : un donjon sans page n'affiche simplement pas de lien.
const fs = require('fs');
const SITE = 'https://www.dofuspourlesnoobs.com';
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// le site écrit ses adresses avec des accents mal encodés (« xeacutelorium », « quecirctes ») : on retire ces suites
const stem = u => norm(u.replace(/^\//, '').replace(/\.html$/, '').replace(/(acute|grave|circ|uml|cedil)/g, '').replace(/-/g, ' '));
// entités HTML du site (accents français, apostrophes, espaces) ; une entité inconnue est conservée telle quelle
const ENT = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', oelig: 'œ', OElig: 'Œ', ccedil: 'ç', Ccedil: 'Ç', ndash: '–', mdash: '—' };
const ACC = { grave: 'à è ì ò ù À È Ì Ò Ù'.split(' '), acute: 'á é í ó ú Á É Í Ó Ú'.split(' '), circ: 'â ê î ô û Â Ê Î Ô Û'.split(' '), uml: 'ä ë ï ö ü Ä Ë Ï Ö Ü'.split(' ') };
for (const [kind, chars] of Object.entries(ACC)) for (const c of chars) ENT[c.normalize('NFD')[0] + kind] = c;
const decode = t => t.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&([A-Za-z]+);/g, (m, k) => ENT[k] ?? m);

const UA = { headers: { 'User-Agent': 'Mozilla/5.0' } };
const get = async path => (await fetch(SITE + path, UA)).text();

// Page « Classées par succès » : une page de guide par succès de quêtes (liens nommés d'après le succès) ou par quête (hors succès, événements).
// Une page est liée à un succès ou à une quête du même nom ; une quête hérite de la page de ses succès quand elle n'a pas la sienne.
function parseGuides(html) {
  const out = new Map(), i = html.indexOf('Premier temps'), body = html.slice(Math.max(0, i - 3000));
  for (const m of body.matchAll(/<a[^>]+href="(\/[^"#]+\.html)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const t = decode(m[2]).replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, ''); if (t && !out.has(m[1])) out.set(m[1], t);
  }
  return out;
}
function mapGuides(guides, data) {
  const ach = new Map(), qn = new Map();
  for (const a of data.succes) { const k = norm(a.n); (ach.get(k) || ach.set(k, []).get(k)).push(a.id); }
  for (const [id, q] of Object.entries(data.quetes)) { const k = norm(q.n); (qn.get(k) || qn.set(k, []).get(k)).push(+id); }
  const owners = new Map();   // quête → succès qui la contiennent
  for (const a of data.succes) for (const o of a.ob) { const ob = data.objectifs[o]; if (ob && ob.t === 'q') (owners.get(ob.r) || owners.set(ob.r, []).get(ob.r)).push(a.id); }
  const achPage = new Map(), questPage = {};
  for (const [u, t] of guides) {
    const k = norm(t), page = [u, t];
    for (const id of ach.get(k) || []) if (!achPage.has(id)) achPage.set(id, page);
    for (const id of qn.get(k) || []) if (!questPage[id]) questPage[id] = [page];
  }
  for (const id of Object.keys(data.quetes)) {
    if (questPage[id]) continue;
    const pages = [], seen = new Set();
    for (const a of owners.get(+id) || []) { const p = achPage.get(a); if (p && !seen.has(p[0])) { seen.add(p[0]); pages.push(p); } }
    if (pages.length) questPage[id] = pages.slice(0, 3);
  }
  return { succes: Object.fromEntries([...achPage].map(([id, p]) => [id, p])), quetes: questPage };
}

async function run(dataFile, outFile) {
  const html = await get('/donjons.html');
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
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8')), g = mapGuides(parseGuides(await get('/classeacutees-par-succegraves.html')), data);
  fs.writeFileSync(outFile, JSON.stringify({ site: SITE, donjons: out, succes: g.succes, quetes: g.quetes }) + '\n');
  console.log(`${Object.keys(out).length} / ${Object.keys(donjons).length} donjons liés`, miss.length ? `· sans page : ${miss.join(' | ')}` : '');
  console.log(`${Object.keys(g.quetes).length} / ${Object.keys(data.quetes).length} quêtes liées (${Object.keys(g.succes).length} succès)`);
}
module.exports = { run, parseGuides, mapGuides };
if (require.main === module) run(process.argv[2] || 'data/dofusdb.json', process.argv[3] || 'data/dpln-links.json').catch(e => { console.error(e); process.exit(1); });
