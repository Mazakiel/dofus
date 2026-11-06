// Construit la page finale (dist/index.html) : coquille src/page.html + src/style.css + src/page/*.js + modules src/ + données DofusDB.
// Usage : node scripts/build.js data/dofusdb.json dist/index.html
// Les données sont allégées : seuls les succès de quêtes suivis (Quêtes hors « Général », Événements) et ceux qu'ils
// référencent (sous-succès, succès exigés par une quête, succès liés à un Dofus) sont gardés ; le reste est retiré.
const fs = require('fs'), path = require('path');
const [succes, out] = process.argv.slice(2);
const { trackedContent } = require('./lib/tracked-content.js');
const D = JSON.parse(fs.readFileSync(succes, 'utf8'));
const light = trackedContent(D);   // la règle « ce qui est suivi » vit dans scripts/lib/tracked-content.js
// La page est assemblée : coquille HTML + feuille de style + fichiers de src/page/ concaténés dans l'ordre de leur nom (un même script).
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const pageJs = fs.readdirSync(path.join(__dirname, '..', 'src', 'page')).filter(f => f.endsWith('.js')).sort().map(f => src('page/' + f)).join('');
const tpl = src('page.html').replace('/*__STYLE__*/', () => src('style.css')).replace('/*__PAGE_JS__*/', () => pageJs);
const sc = JSON.stringify(light).replace(/</g, '\\u003c');
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
// les modules src/progression.js et src/progress-store.js sont insérés tels quels : mêmes fichiers dans la page et dans les tests
const progression = fs.readFileSync(path.join(__dirname, '..', 'src', 'progression.js'), 'utf8');
const progressStore = fs.readFileSync(path.join(__dirname, '..', 'src', 'progress-store.js'), 'utf8');
fs.writeFileSync(out, tpl.replace('/*__PROGRESSION__*/', () => progression).replace('/*__PROGRESS_STORE__*/', () => progressStore).replace('/*__DATA__*/null', () => sc));
console.log(`succès gardés ${light.succes.length} / ${D.succes.length} (dont ${light.succes.filter(a => a.t).length} suivis) · objectifs ${Object.keys(light.objectifs).length} · quêtes ${Object.keys(D.quetes).length} · écrit ${out} ${(fs.statSync(out).size / 1024).toFixed(0)} Ko`);
