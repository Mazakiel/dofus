// Compare deux versions des données DofusDB : ce qui est ajouté, retiré, modifié, et si la nouvelle version a l'air saine.
// Sert à la mise à jour automatique (scripts/diff-data.js) : les retraits sont ce qui peut laisser des coches orphelines,
// et une chute brutale des effectifs ou des références cassées signale un changement de format de l'API plutôt qu'une vraie nouveauté.

const SECTIONS = [
  { key: 'succes', label: 'succès', risky: ['ob', 'c'] },
  { key: 'quetes', label: 'quêtes', risky: ['pre', 'preA', 'preD', 'lv'] },
  { key: 'objectifs', label: 'objectifs', risky: ['t', 'r', 'a'] },
  { key: 'dofus', label: 'Dofus', risky: ['a', 'q', 'pa', 'pre'] },
  { key: 'donjons', label: 'donjons', risky: ['lv'] },
  { key: 'categories', label: 'catégories', risky: ['p'] },
];
const records = (data, key) => {
  const v = (data || {})[key];
  if (Array.isArray(v)) return new Map(v.map(r => [String(r.id), r]));
  return new Map(Object.entries(v || {}));
};
const nameOf = r => (r && (r.n || (r.name && r.name.fr))) || '';
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

// Différences par section : { ajoutés, retirés, modifiés (avec les champs touchés, `risky` si un prérequis ou un lien change) }
function diffData(a, b) {
  const sections = {};
  let changed = false, removals = 0;
  for (const { key, label, risky } of SECTIONS) {
    const A = records(a, key), B = records(b, key), s = { label, added: [], removed: [], changed: [] };
    for (const [id, r] of B) if (!A.has(id)) s.added.push({ id, name: nameOf(r) });
    for (const [id, r] of A) {
      if (!B.has(id)) { s.removed.push({ id, name: nameOf(r) }); continue; }
      const nb = B.get(id);
      const fields = [...new Set([...Object.keys(r), ...Object.keys(nb)])].filter(k => !same(r[k], nb[k]));
      if (fields.length) s.changed.push({ id, name: nameOf(nb), fields, risky: fields.some(f => risky.includes(f)) });
    }
    if (s.added.length || s.removed.length || s.changed.length) changed = true;
    removals += s.removed.length;
    sections[key] = s;
  }
  return { sections, changed, removals };
}

// Références qui ne mènent nulle part dans une version des données
function dangling(d) {
  const quetes = records(d, 'quetes'), succes = records(d, 'succes'), objectifs = records(d, 'objectifs');
  let pre = 0, preA = 0, obj = 0, ob = 0;
  for (const q of quetes.values()) { for (const p of q.pre || []) if (!quetes.has(String(p))) pre++; for (const x of q.preA || []) if (!succes.has(String(x))) preA++; }
  for (const o of objectifs.values()) if (!succes.has(String(o.a))) obj++;
  for (const a of succes.values()) for (const o of a.ob || []) if (!objectifs.has(String(o))) ob++;
  return { pre, preA, obj, ob };
}
const count = (d, k) => records(d, k).size;
const enrichedShare = d => { const q = [...records(d, 'quetes').values()]; return q.length ? q.filter(x => x.tg || x.ft).length / q.length : 0; };

// Problèmes qui font douter de la nouvelle version (liste vide = saine). `old` permet de comparer ; sans lui, contrôles de structure seulement.
function checkData(neu, old) {
  const problems = [];
  for (const k of ['succes', 'quetes', 'objectifs', 'dofus', 'categories']) if (!count(neu, k)) problems.push(`section « ${k} » vide ou absente`);
  for (const k of ['succes', 'dofus', 'categories']) {
    const arr = Array.isArray(neu[k]) ? neu[k] : [], ids = arr.map(r => r.id);
    if (new Set(ids).size !== ids.length) problems.push(`identifiants en double dans « ${k} »`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(neu.genereLe || ''))) problems.push('date de génération absente');
  if (old) {
    for (const k of ['succes', 'quetes', 'objectifs', 'dofus', 'categories', 'donjons']) {
      const before = count(old, k), after = count(neu, k);
      if (before >= 10 && after < before * 0.9) problems.push(`« ${k} » chute de ${before} à ${after} (plus de 10 %)`);
    }
    const d0 = dangling(old), d1 = dangling(neu);
    for (const k of Object.keys(d1)) if (d1[k] > d0[k] + 10) problems.push(`références cassées en hausse (${k} : ${d0[k]} → ${d1[k]})`);
    const e0 = enrichedShare(old), e1 = enrichedShare(neu);
    if (e0 > 0.2 && e1 < e0 * 0.6) problems.push(`enrichissement des quêtes en chute (${Math.round(e0 * 100)} % → ${Math.round(e1 * 100)} %)`);
  }
  return problems;
}

// Résumé lisible (Markdown) pour la page du workflow et le message de commit
function markdown(diff, problems = []) {
  const L = ['## Mise à jour des données DofusDB', ''];
  if (problems.length) L.push('### ⚠️ Anomalies : rien n’est publié', '', ...problems.map(p => `- ${p}`), '');
  L.push('| | ajoutés | retirés | modifiés |', '|---|---:|---:|---:|');
  for (const s of Object.values(diff.sections)) L.push(`| ${s.label} | ${s.added.length} | ${s.removed.length} | ${s.changed.length} |`);
  L.push('');
  const list = (title, items, fmt, max = 25) => { if (!items.length) return; L.push(`### ${title}`, '', ...items.slice(0, max).map(fmt), items.length > max ? `- … et ${items.length - max} autres` : '', ''); };
  for (const s of Object.values(diff.sections)) list(`Retirés : ${s.label} (des coches enregistrées sur ces identifiants deviennent orphelines)`, s.removed, r => `- ${r.id} « ${r.name} »`);
  for (const s of Object.values(diff.sections)) if (s.label !== 'objectifs') list(`Ajoutés : ${s.label}`, s.added, r => `- ${r.id} « ${r.name} »`);
  for (const s of Object.values(diff.sections)) list(`Liens ou prérequis modifiés : ${s.label}`, s.changed.filter(c => c.risky), c => `- ${c.id} « ${c.name} » (${c.fields.join(', ')})`);
  return L.join('\n');
}
// Titre court pour le commit
function title(diff, date) {
  const n = k => diff.sections[k];
  const bits = [];
  for (const k of ['succes', 'quetes', 'dofus', 'donjons']) { const s = n(k); if (s.added.length) bits.push(`+${s.added.length} ${s.label}`); if (s.removed.length) bits.push(`−${s.removed.length} ${s.label}`); }
  const mods = Object.values(diff.sections).reduce((m, s) => m + s.changed.length, 0);
  if (mods) bits.push(`${mods} modifiés`);
  return `Données DofusDB du ${date}${bits.length ? ' : ' + bits.join(', ') : ''}`;
}

module.exports = { diffData, checkData, dangling, markdown, title };
