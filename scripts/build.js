// Construit la page finale (dist/index.html) : modèle src/page.html + module src/progression.js + données DofusDB.
// Usage : node scripts/build.js data/dofusdb.json dist/index.html
// Les données sont allégées : seuls les succès de quêtes suivis (Quêtes hors « Général », Événements) et ceux qu'ils
// référencent (sous-succès, succès exigés par une quête, succès liés à un Dofus) sont gardés ; le reste est retiré.
const fs = require('fs'), path = require('path');
const [succes, out] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(succes, 'utf8'));
const cat = Object.fromEntries(D.categories.map(c => [c.id, c]));
const top = id => { let c = cat[id]; while (c && c.p && cat[c.p]) c = cat[c.p]; return c ? c.id : null; };
const QUETES = 8, EVENTS = 9, QGEN = 118, GEN = 15;
const ach = Object.fromEntries(D.succes.map(a => [a.id, a]));
const keep = new Set();
const add = id => { if (keep.has(id) || !ach[id]) return; keep.add(id); for (const oid of ach[id].ob) { const o = D.objectifs[oid]; if (o && o.t === 'a') add(o.r); } };
for (const a of D.succes) { const t = top(a.c); if (a.c !== QGEN && a.c !== GEN && (t === QUETES || t === EVENTS)) add(a.id); }
for (const q of Object.values(D.quetes)) (q.preA || []).forEach(add);
for (const d of D.dofus || []) { if (d.a) add(d.a); (d.pa || []).forEach(add); }
const succesK = D.succes.filter(a => keep.has(a.id));
const catK = new Set(); for (const a of succesK) { let c = cat[a.c]; while (c) { catK.add(c.id); c = cat[c.p]; } }
const objK = {}; for (const a of succesK) for (const oid of a.ob) if (D.objectifs[oid]) objK[oid] = D.objectifs[oid];
const light = { ...D, categories: D.categories.filter(c => catK.has(c.id)), succes: succesK, objectifs: objK };
const tpl = fs.readFileSync(path.join(__dirname, '..', 'src', 'page.html'), 'utf8');
const sc = JSON.stringify(light).replace(/</g, '\\u003c');
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
// le module de règles de progression (src/progression.js) est inséré tel quel : même fichier dans la page et dans les tests
const progression = fs.readFileSync(path.join(__dirname, '..', 'src', 'progression.js'), 'utf8');
fs.writeFileSync(out, tpl.replace('/*__PROGRESSION__*/', () => progression).replace('/*__DATA__*/null', () => sc));
console.log(`succès gardés ${succesK.length} / ${D.succes.length} · objectifs ${Object.keys(objK).length} · quêtes ${Object.keys(D.quetes).length} · écrit ${out} ${(fs.statSync(out).size / 1024).toFixed(0)} Ko`);
