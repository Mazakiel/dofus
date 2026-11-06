// Compare deux versions des données DofusDB et décide si la mise à jour peut être publiée.
// Usage : node scripts/diff-data.js ancien.json nouveau.json [--summary fichier.md] [--github-output fichier]
//   - écrit le résumé Markdown (sortie standard, et en plus dans --summary, ex. $GITHUB_STEP_SUMMARY) ;
//   - écrit dans --github-output (ex. $GITHUB_OUTPUT) : changed=true|false, anomaly=true|false, title=…
//   - code de sortie 1 s'il y a une anomalie (la nouvelle version n'est alors pas publiée), 0 sinon.
const fs = require('fs');
const { diffData, checkData, markdown, title } = require('./lib/data-diff.js');

const args = process.argv.slice(2), flag = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const [oldFile, newFile] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const oldData = JSON.parse(fs.readFileSync(oldFile, 'utf8')), newData = JSON.parse(fs.readFileSync(newFile, 'utf8'));

const diff = diffData(oldData, newData), problems = checkData(newData, oldData);
// la seule date de génération qui change n'est pas une mise à jour
const changed = diff.changed;
const md = markdown(diff, problems);
console.log(md);
if (flag('--summary')) fs.appendFileSync(flag('--summary'), md + '\n');
if (flag('--github-output')) fs.appendFileSync(flag('--github-output'), `changed=${changed}\nanomaly=${problems.length > 0}\ntitle=${title(diff, newData.genereLe)}\n`);
process.exit(problems.length ? 1 : 0);
