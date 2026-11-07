// Télécharge les données de progression depuis DofusDB (succès, objectifs, quêtes, Dofus) et écrit le JSON.
// Usage : node scripts/fetch-dofusdb.js data/dofusdb.json   (cache dans cache/ ; à suivre de scripts/enrich-dofusdb.js, ou voir scripts/update-data.js)
// Télécharge (avec cache) catégories, succès, objectifs et niveaux des quêtes, et écrit le JSON (format compact).
const fs = require('fs');
const { createClient } = require('./lib/dofusdb.js');
const { parseObjective, parseStart } = require('./lib/criteria.js');

async function run(client, OUT) {
  // quêtes d'un coup, avec un cache par quête (y compris « absente »)
  async function fetchQuests(ids) {
    const out = {}, todo = [];
    for (const id of ids) { const n = `qsc-${id}.json`; if (client.cache.has(n)) out[id] = client.cache.read(n); else todo.push(id); }
    await client.byIds('quests', todo, ['id', 'name', 'levelMin', 'isPartyQuest', 'isEvent', 'categoryId', 'startCriterion'], {
      wait: 150, onChunk: (got, part) => { for (const id of part) { out[id] = got[id] || null; client.cache.write(`qsc-${id}.json`, out[id]); } } });
    return out;
  }
  const cats = await client.all('achievement-categories', ['id', 'parentId', 'order', 'name', 'achievementIds', 'visibilityCriterion']);
  const achs = await client.all('achievements', ['id', 'categoryId', 'iconId', 'points', 'level', 'order', 'accountLinked', 'objectiveIds', 'name', 'description']);
  const objs = await client.all('achievement-objectives', ['id', 'achievementId', 'order', 'criterion', 'name']);

  // Titres et ornements donnés par les succès (achievement-rewards) : ti = titres { id, n }, or = ornements { id, n, i (icône) }
  const titres = Object.fromEntries((await client.all('titles', ['id', 'nameMale', 'nameFemale'])).map(t => [t.id, t]));
  const ornements = Object.fromEntries((await client.all('ornaments', ['id', 'name', 'iconId'])).map(o => [o.id, o]));
  const recompenses = await client.all('achievement-rewards', ['id', 'achievementId', 'titlesReward', 'ornamentsReward']);
  const ti = {}, orn = {};
  for (const r of recompenses) {
    for (const id of r.titlesReward || []) { const t = titres[id]; if (t && t.nameMale && t.nameMale.fr) ((ti[r.achievementId] = ti[r.achievementId] || [])).push({ id, n: t.nameMale.fr }); }
    for (const id of r.ornamentsReward || []) { const o = ornements[id]; if (o && o.name && o.name.fr) ((orn[r.achievementId] = orn[r.achievementId] || [])).push({ id, n: o.name.fr, i: o.iconId }); }
  }
  console.log('succès qui donnent un titre :', Object.keys(ti).length, '· un ornement :', Object.keys(orn).length);

  const objOut = {};
  for (const o of objs) { const p = parseObjective(o.criterion); objOut[o.id] = { a: o.achievementId, n: (o.name && o.name.fr) || '', t: p.t, ...(p.r ? { r: p.r } : {}) }; }

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
  const qByName = client.cache.has('quetes-par-nom.json') ? client.cache.read('quetes-par-nom.json') : {};
  let relies = 0;
  for (const o of Object.values(objOut)) {
    if (!o.v) continue;
    const m = o.n.match(/^Terminer la quête\s*:\s*(.+?)\s*\.?$/i); if (!m) continue;
    const nom = m[1];
    if (!(nom in qByName)) {
      const j = await client.get(`quests?name.fr=${encodeURIComponent(nom)}&$limit=2&$select[]=id`);
      qByName[nom] = j.data.length === 1 ? j.data[0].id : null;
      await client.pause(120);
    }
    if (qByName[nom]) { o.t = 'q'; o.r = qByName[nom]; delete o.v; relies++; }
  }
  client.cache.write('quetes-par-nom.json', qByName);
  console.log('objectifs « Terminer la quête : X » reliés à leur quête :', relies);

  // Quêtes : celles des succès, puis, de proche en proche, celles exigées par leurs conditions de départ (startCriterion).
  // Qf=X → la quête X doit être terminée ; OA=Y → le succès Y doit être obtenu. Les alternatives « a|b » sont ignorées.
  // ---- Dofus (objets de type 23) et ce qui les donne, d'après DofusDB uniquement ----
  // 1) récompense d'un succès (achievement-rewards), 2) succès dont la description cite le Dofus, 3) récompense d'une étape de quête
  const dz = await client.cached('dofus-map-v2.json', async () => {
    const items = (await client.get(`items?typeId=23&$limit=50&$select[]=id&$select[]=name&$select[]=iconId&$select[]=level&$select[]=description&$select[]=criterions`)).data;
    const ids = items.map(i => i.id);
    const ar = (await client.get(`achievement-rewards?${ids.map(i => `itemsReward[$in][]=${i}`).join('&')}&$limit=50&$select[]=achievementId&$select[]=itemsReward`)).data;
    const qr = (await client.get(`quest-step-rewards?${ids.map(i => `itemsRewardIds[$in][]=${i}`).join('&')}&$limit=50&$select[]=stepId&$select[]=itemsRewardIds`)).data;
    const stepIds = [...new Set(qr.map(r => r.stepId))];
    const steps = stepIds.length ? (await client.get(`quest-steps?${stepIds.map(i => `id[$in][]=${i}`).join('&')}&$limit=50&$select[]=id&$select[]=questId`)).data : [];
    const stepQuest = Object.fromEntries(steps.map(s => [s.id, s.questId]));
    return { items, ar, qr: qr.map(r => ({ q: stepQuest[r.stepId], items: r.itemsRewardIds })) };
  });
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
    const lvs = await client.cached(`steps-lv-${d.q}.json`, async () => {
      const r = (await client.get(`quest-steps?questId=${d.q}&$limit=50&$select[]=optimalLevel`)).data.map(s => s.optimalLevel).filter(x => x > 0);
      await client.pause(120); return r;
    });
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
      n: (a.name && a.name.fr) || '', d: (a.description && a.description.fr) || '', ob: a.objectiveIds || [], ...(a.accountLinked ? { cpt: 1 } : {}),
      ...(ti[a.id] ? { ti: ti[a.id] } : {}), ...(orn[a.id] ? { or: orn[a.id] } : {}) })),
    objectifs: objOut,
    quetes: qOut,
    dofus: dofusOut,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const types = Object.values(objOut).reduce((m, o) => (m[o.t] = (m[o.t] || 0) + 1, m), {});
  console.log(`catégories ${cats.length} · succès ${achs.length} · objectifs ${objs.length}`, types,
    `· quêtes ${qIds.length} · ${(fs.statSync(OUT).size / 1024).toFixed(0)} Ko`);
}

module.exports = { run };
if (require.main === module) run(createClient(), process.argv[2]).catch(e => { console.error(e); process.exit(1); });
