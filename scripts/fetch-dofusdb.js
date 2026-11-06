// Télécharge les données de progression depuis DofusDB (succès, objectifs, quêtes, Dofus) et écrit le JSON.
// Usage : node scripts/fetch-dofusdb.js data/dofusdb.json   (cache dans cache/ ; à suivre de scripts/enrich-dofusdb.js)
// Télécharge (avec cache) catégories, succès, objectifs et niveaux des quêtes, et écrit succes.json (format compact).
const fs = require('fs'), path = require('path');
const S = path.resolve(__dirname, '..');
const CACHE = path.join(S, 'cache'); fs.mkdirSync(CACHE, { recursive: true });
const [OUT] = process.argv.slice(2);
const API = 'https://api.dofusdb.fr/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url) {
  for (let t = 0; t < 4; t++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return await r.json(); }
    catch (e) { process.stderr.write(`\nretry ${url.slice(0, 80)} ${e.message}`); await sleep(1500 * (t + 1)); }
  }
  throw new Error('échec ' + url);
}
// Télécharge tout un point d'accès, page par page (50 max), avec cache disque
async function fetchAll(endpoint, select) {
  const file = path.join(CACHE, `all-${endpoint}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const sel = select.map(s => `&$select[]=${s}`).join('');
  const first = await getJson(`${API}${endpoint}?$limit=50&$skip=0&$sort[id]=1${sel}`);
  const out = [...first.data];
  for (let skip = 50; skip < first.total; skip += 50) {
    const j = await getJson(`${API}${endpoint}?$limit=50&$skip=${skip}&$sort[id]=1${sel}`);
    out.push(...j.data);
    process.stderr.write(`\r${endpoint} ${out.length}/${first.total}`);
    await sleep(150);
  }
  process.stderr.write('\n');
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}
async function fetchQuests(ids) {
  const out = {}, todo = [];
  for (const id of ids) { const p = path.join(CACHE, `qsc-${id}.json`); if (fs.existsSync(p)) out[id] = JSON.parse(fs.readFileSync(p, 'utf8')); else todo.push(id); }
  for (let i = 0; i < todo.length; i += 40) {
    const chunk = todo.slice(i, i + 40);
    const j = await getJson(`${API}quests?${chunk.map(id => `id[$in][]=${id}`).join('&')}&$limit=50&$select[]=id&$select[]=name&$select[]=levelMin&$select[]=isPartyQuest&$select[]=isEvent&$select[]=categoryId&$select[]=startCriterion`);
    for (const q of j.data) { out[q.id] = q; fs.writeFileSync(path.join(CACHE, `qsc-${q.id}.json`), JSON.stringify(q)); }
    for (const id of chunk) if (!out[id]) { out[id] = null; fs.writeFileSync(path.join(CACHE, `qsc-${id}.json`), 'null'); }
    process.stderr.write(`\rquêtes ${Math.min(i + 40, todo.length)}/${todo.length}`);
    await sleep(150);
  }
  return out;
}

(async () => {
  const cats = await fetchAll('achievement-categories', ['id', 'parentId', 'order', 'name', 'achievementIds', 'visibilityCriterion']);
  const achs = await fetchAll('achievements', ['id', 'categoryId', 'iconId', 'points', 'level', 'order', 'accountLinked', 'objectiveIds', 'name', 'description']);
  const objs = await fetchAll('achievement-objectives', ['id', 'achievementId', 'order', 'criterion', 'name']);

  // Critère d'objectif : Qf=ID → quête terminée, OA=ID → succès obtenu, sinon autre (monstre, donjon, niveau…)
  const parse = c => {
    c = c || '';
    let m;
    if ((m = c.match(/Qf=(\d+)/))) return { t: 'q', r: +m[1] };
    if ((m = c.match(/OA=(\d+)/))) return { t: 'a', r: +m[1] };
    return { t: 'x' };
  };
  const objOut = {};
  for (const o of objs) { const p = parse(o.criterion); objOut[o.id] = { a: o.achievementId, n: (o.name && o.name.fr) || '', t: p.t, ...(p.r ? { r: p.r } : {}) }; }

  // Objectifs que DofusDB ne publie pas (succès de niveau, etc.) : objectif unique tiré de la description du succès.
  // « Atteindre le niveau N » devient un objectif de niveau, validé d'après le niveau saisi dans la page.
  let virtuels = 0;
  for (const a of achs) for (const oid of a.objectiveIds || []) if (!objOut[oid]) {
    const d = (a.description && a.description.fr) || (a.name && a.name.fr) || '';
    const lv = d.match(/^Atteindre le niveau (\d+)/i);
    objOut[oid] = lv ? { a: a.id, n: d, t: 'lvl', r: +lv[1] } : { a: a.id, n: d, t: 'x', v: 1 };
    virtuels++;
  }
  console.log('objectifs reconstitués depuis la description :', virtuels);
  // « Terminer la quête : X » reconstitué → vraie quête X (recherchée par son nom exact dans DofusDB)
  const qByNameFile = path.join(CACHE, 'quetes-par-nom.json');
  const qByName = fs.existsSync(qByNameFile) ? JSON.parse(fs.readFileSync(qByNameFile, 'utf8')) : {};
  let relies = 0;
  for (const o of Object.values(objOut)) {
    if (!o.v) continue;
    const m = o.n.match(/^Terminer la quête\s*:\s*(.+?)\s*\.?$/i); if (!m) continue;
    const nom = m[1];
    if (!(nom in qByName)) {
      const j = await getJson(`${API}quests?name.fr=${encodeURIComponent(nom)}&$limit=2&$select[]=id`);
      qByName[nom] = j.data.length === 1 ? j.data[0].id : null;
      await sleep(120);
    }
    if (qByName[nom]) { o.t = 'q'; o.r = qByName[nom]; delete o.v; relies++; }
  }
  fs.writeFileSync(qByNameFile, JSON.stringify(qByName));
  console.log('objectifs « Terminer la quête : X » reliés à leur quête :', relies);

  // Quêtes : celles des succès, puis, de proche en proche, celles exigées par leurs conditions de départ (startCriterion).
  // Qf=X → la quête X doit être terminée ; OA=Y → le succès Y doit être obtenu. Les alternatives « a|b » sont ignorées.
  const parseStart = c => {
    const pre = new Set(), preA = new Set(), po = new Set();
    // découpe au niveau 0 des parenthèses : a&(b|c)&d → [a, (b|c), d]
    const split = (s, sep) => { const out = []; let depth = 0, cur = '';
      for (const ch of s) { if (ch === '(') depth++; else if (ch === ')') depth--; if (ch === sep && !depth) { out.push(cur); cur = ''; } else cur += ch; }
      out.push(cur); return out; };
    const wrapped = s => { if (!s.startsWith('(') || !s.endsWith(')')) return false; let d = 0;
      for (let i = 0; i < s.length - 1; i++) { if (s[i] === '(') d++; else if (s[i] === ')') d--; if (!d) return false; } return true; };
    const unwrap = s => { s = s.trim(); while (wrapped(s)) s = s.slice(1, -1).trim(); return s; };
    for (let part of split(String(c || ''), '&')) {
      part = unwrap(part);
      const alts = split(part, '|');
      if (alts.length > 1) {
        // « (quête X en cours, assez avancée) OU (quête X terminée) » : on exige la quête X terminée
        const ids = alts.map(a => new Set([...a.matchAll(/Q[fa]=(\d+)/g)].map(m => +m[1])));
        for (const id of ids[0]) if (ids.every(s => s.has(id))) pre.add(id);
        continue;
      }
      let m; if ((m = part.match(/Qf=(\d+)/))) pre.add(+m[1]); if ((m = part.match(/OA=(\d+)/))) preA.add(+m[1]);
      if ((m = part.match(/PO=(\d+)/))) po.add(+m[1]);   // posséder un objet (filtré plus bas sur les Dofus)
    }
    return { pre: [...pre], preA: [...preA], po: [...po] };
  };
  // ---- Dofus (objets de type 23) et ce qui les donne, d'après DofusDB uniquement ----
  // 1) récompense d'un succès (achievement-rewards), 2) succès dont la description cite le Dofus, 3) récompense d'une étape de quête
  const dzFile = path.join(CACHE, 'dofus-map-v2.json');
  let dz;
  if (fs.existsSync(dzFile)) dz = JSON.parse(fs.readFileSync(dzFile, 'utf8'));
  else {
    const items = (await getJson(`${API}items?typeId=23&$limit=50&$select[]=id&$select[]=name&$select[]=iconId&$select[]=level&$select[]=description&$select[]=criterions`)).data;
    const ids = items.map(i => i.id);
    const ar = (await getJson(`${API}achievement-rewards?${ids.map(i => `itemsReward[$in][]=${i}`).join('&')}&$limit=50&$select[]=achievementId&$select[]=itemsReward`)).data;
    const qr = (await getJson(`${API}quest-step-rewards?${ids.map(i => `itemsRewardIds[$in][]=${i}`).join('&')}&$limit=50&$select[]=stepId&$select[]=itemsRewardIds`)).data;
    const stepIds = [...new Set(qr.map(r => r.stepId))];
    const steps = stepIds.length ? (await getJson(`${API}quest-steps?${stepIds.map(i => `id[$in][]=${i}`).join('&')}&$limit=50&$select[]=id&$select[]=questId`)).data : [];
    const stepQuest = Object.fromEntries(steps.map(s => [s.id, s.questId]));
    dz = { items, ar, qr: qr.map(r => ({ q: stepQuest[r.stepId], items: r.itemsRewardIds })) };
    fs.writeFileSync(dzFile, JSON.stringify(dz));
  }
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const dofus = [];
  for (const it of dz.items) {
    const nom = (it.name && it.name.fr) || '';
    const byReward = dz.ar.filter(r => (r.itemsReward || []).includes(it.id)).map(r => r.achievementId);
    const byDesc = byReward.length ? [] : achs.filter(a => /série des quêtes|obtenir le/i.test((a.description && a.description.fr) || '') && norm(a.description && a.description.fr).includes(norm(nom))).map(a => a.id);
    const byQuest = dz.qr.filter(r => r.items.includes(it.id)).map(r => r.q).filter(Boolean);
    // 4) critère d'utilisation de l'objet « Qa=X » (quête X en cours) : l'objet est remis pendant cette quête (ex. Verdoyant)
    const qa = !byReward.length && !byDesc.length && !byQuest.length ? (String(it.criterions || '').match(/^\(?Qa=(\d+)/) || [])[1] : null;
    const desc = (it.description && it.description.fr) || '';
    // un succès dont la description est « obtenir le Dofus X » le donne ; une « série des quêtes (du gardien) du Dofus X » n'est qu'un prérequis (ex. Ocre d'ambre)
    const descObtient = byDesc.length && /obtenir le/i.test((achs.find(a => a.id === byDesc[0]).description || {}).fr || '');
    dofus.push({ id: it.id, n: nom, ic: it.iconId, lv: it.level, a: byReward[0] || byDesc[0] || null, q: byQuest[0] || (qa ? +qa : null),
      src: byReward.length ? 'récompense de succès' : byDesc.length ? (descObtient ? 'description de succès' : 'succès prérequis') : byQuest.length ? 'récompense de quête' : qa ? 'remis pendant la quête' : null,
      ...(byDesc.length && !descObtient ? { pre: 1 } : {}),
      ...(/offert par les gardiens d.Ankama/i.test(desc) ? { cadeau: 1 } : {}) });
  }
  // un même Dofus peut exister en plusieurs objets (Cacao, Sylvestre, Vulbis…) : on garde celui qui a un lien
  const dofusOut = [];
  // Seuls rattachements faits à la main : DofusDB n'enregistre pas l'objet remis par dialogue.
  // Dofus Ocre : deux succès prérequis, « Ocre d'ambre » (5220) et « La fin de l'éternité » (565, quête « L'éternelle moisson »),
  // puis un dialogue avec le PNJ. Aucun des deux ne donne l'objet dans DofusDB : le Dofus se coche à la main (pre).
  const MANUEL = { 7754: { pa: [5220, 565], src: 'manuel : succès prérequis puis dialogue' } };
  for (const d of dofus) if (MANUEL[d.id]) { d.a = null; d.q = null; d.pa = MANUEL[d.id].pa; d.src = MANUEL[d.id].src; d.pre = 1; }
  const rank = d => ['récompense de succès', 'description de succès', 'récompense de quête', 'remis pendant la quête', 'succès prérequis'].indexOf(d.src) >>> 0;
  const rankM = d => d.src && d.src.startsWith('manuel') ? -1 : rank(d);   // sans lien = le moins bon
  for (const d of dofus) { const i = dofusOut.findIndex(x => x.n === d.n); if (i < 0) dofusOut.push(d); else if (rankM(d) < rankM(dofusOut[i])) dofusOut[i] = d; }
  console.log('Dofus', dofusOut.length, '· reliés :', dofusOut.filter(d => d.a || d.q).length, '· sans lien :', dofusOut.filter(d => !d.a && !d.q).map(d => d.n).join(', '));

  const quests = {};
  let frontier = [...new Set([...Object.values(objOut).filter(o => o.t === 'q').map(o => o.r), ...dofusOut.filter(d => d.q).map(d => d.q)])];
  while (frontier.length) {
    const got = await fetchQuests(frontier);
    Object.assign(quests, got);
    const next = new Set();
    for (const id of frontier) { const q = got[id]; if (!q) continue; for (const p of parseStart(q.startCriterion).pre) if (!(p in quests)) next.add(p); }
    frontier = [...next].filter(id => !(id in quests));
  }
  // objet Dofus (tous les objets de type Dofus, y compris les doublons) → Dofus retenu dans la liste
  const dzOf = {}; for (const it of dz.items) { const kept = dofusOut.find(d => d.n === ((it.name && it.name.fr) || '')); if (kept) dzOf[it.id] = kept.id; }
  const qOut = {};
  for (const [id, q] of Object.entries(quests)) {
    if (!q) continue;
    const st = parseStart(q.startCriterion);
    const preD = [...new Set(st.po.map(i => dzOf[i]).filter(Boolean))];   // Dofus à posséder pour lancer la quête
    qOut[id] = { n: (q.name && q.name.fr) || '', lv: q.levelMin ?? null, ...(st.pre.length ? { pre: st.pre } : {}), ...(st.preA.length ? { preA: st.preA } : {}), ...(preD.length ? { preD } : {}),
      ...(q.isPartyQuest ? { grp: 1 } : {}), ...(q.isEvent ? { ev: 1 } : {}) };
  }
  const qIds = Object.keys(qOut);
  // Tranche de niveau d'un Dofus donné par une quête : niveau des étapes (optimalLevel), ex. « L'éternelle moisson » 40 → 180
  for (const d of dofusOut) if (d.q) {
    const f = path.join(CACHE, `steps-lv-${d.q}.json`);
    let lvs;
    if (fs.existsSync(f)) lvs = JSON.parse(fs.readFileSync(f, 'utf8'));
    else { lvs = (await getJson(`${API}quest-steps?questId=${d.q}&$limit=50&$select[]=optimalLevel`)).data.map(s => s.optimalLevel).filter(x => x > 0); fs.writeFileSync(f, JSON.stringify(lvs)); await sleep(120); }
    if (lvs.length) d.lvq = [Math.min(...lvs), Math.max(...lvs)];
  }
  // Quêtes qui exigent de posséder un Dofus (PO=id dans leurs conditions de départ) : donne au moins sa place dans l'ordre
  for (const d of dofusOut) {
    const req = Object.entries(quests).filter(([, q]) => q && new RegExp(`PO=${d.id}(?!\\d)`).test(q.startCriterion || '')).map(([id]) => +id);
    if (req.length) d.req = req;
  }

  const out = {
    genereLe: new Date().toISOString().slice(0, 10),
    categories: cats.map(c => ({ id: c.id, p: c.parentId || 0, o: c.order, n: (c.name && c.name.fr) || '' })),
    succes: achs.map(a => ({ id: a.id, c: a.categoryId, ic: a.iconId, pts: a.points, lv: a.level, o: a.order,
      n: (a.name && a.name.fr) || '', d: (a.description && a.description.fr) || '', ob: a.objectiveIds || [], ...(a.accountLinked ? { cpt: 1 } : {}) })),
    objectifs: objOut,
    quetes: qOut,
    dofus: dofusOut,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const types = Object.values(objOut).reduce((m, o) => (m[o.t] = (m[o.t] || 0) + 1, m), {});
  console.log(`catégories ${cats.length} · succès ${achs.length} · objectifs ${objs.length}`, types,
    `· quêtes ${qIds.length} · ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko`);
})();
