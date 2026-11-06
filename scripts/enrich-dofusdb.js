// Enrichit data/dofusdb.json avec, pour chaque quête : étiquettes (donjon, combat, farm, craft, exploration),
// donjons concernés et liste lisible de ce qu'il y a à faire. Source : DofusDB uniquement.
// Usage : node scripts/enrich-dofusdb.js data/dofusdb.json   (réécrit le fichier ; à relancer après fetch-dofusdb.js)
const fs = require('fs');
const { createClient } = require('./lib/dofusdb.js');
const fr = n => (n && (n.fr || n.en)) || '';

async function run(client, FILE) {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const qids = Object.keys(data.quetes);

  // 1. quêtes complètes (étapes + objectifs)
  const full = await client.cached('quetes-full.json', () => client.byIds('quests', qids, [], { chunk: 20 }));

  // 2. identifiants à résoudre : objets, monstres, zones
  const want = { item: new Set(), monster: new Set(), subarea: new Set() };
  const TOK = /\{(item|monster|subarea|npc|map|alteration),(\d+)(?:::[^}]*)?\}/g;
  for (const q of Object.values(full)) for (const s of q.steps) for (const o of s.objectives) {
    for (const m of fr(o.text).matchAll(TOK)) if (want[m[1]]) want[m[1]].add(+m[2]);
    (o.need && o.need.generated && o.need.generated.items || []).forEach(id => want.item.add(id));
  }
  const items = await client.cached('items-min.json', () => client.byIds('items', [...want.item], ['id', 'name', 'dropMonsterIds', 'hasRecipe']));
  const monsters = await client.cached('monsters-min.json', () => client.byIds('monsters', [...want.monster], ['id', 'name']));
  const subareas = await client.cached('subareas-min.json', () => client.byIds('subareas', [...want.subarea], ['id', 'name']));
  // donjons : toutes les pages (l'API plafonne à 50 par page, géré par le client)
  const dungeons = Object.fromEntries((await client.all('dungeons', ['id', 'name', 'optimalPlayerLevel', 'bosses'])).map(d => [d.id, d]));
  // noms des boss de donjon
  const bossIds = [...new Set(Object.values(dungeons).flatMap(d => d.bosses || []))].filter(id => !monsters[id]);
  if (bossIds.length) Object.assign(monsters, await client.byIds('monsters', bossIds, ['id', 'name']));
  // des ids peuvent manquer si le cache est plus ancien que les données : on complète
  for (const [kind, store, sel] of [['item', items, ['id', 'name', 'dropMonsterIds', 'hasRecipe']], ['monster', monsters, ['id', 'name']]]) {
    const miss = [...want[kind]].filter(id => !store[id]);
    if (miss.length) Object.assign(store, await client.byIds(kind + 's', miss, sel));
  }

  const nameOf = { item: id => fr((items[id] || {}).name), monster: id => fr((monsters[id] || {}).name), subarea: id => fr((subareas[id] || {}).name) };
  const clean = t => t
    .replace(/ sur la carte \{map,\d+(?:::[^}]*)?\}/g, '')
    .replace(/ (?:à|au|aux) \{npc,\d+\}/g, '')
    .replace(TOK, (m, k, id) => (nameOf[k] ? nameOf[k](+id) : '') || '')
    .replace(/\s+en un seul combat/, '')
    .replace(/^Vaincre x(\d+) (.+)$/, (m, n, nom) => +n > 1 ? `Vaincre ${n} × ${nom}` : `Vaincre ${nom}`)
    .replace(/^Découvrir la carte ?:/, 'Découvrir la carte :')
    .replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
  const FIGHT = /^QuestObjective(Multi)?FightMonster|FightMonstersOnMap/;
  const COMBAT_WORDS = /(?<![\p{L}])(vaincre|neutralis\w*|affronter|éliminer|tuer)(?![\p{L}])/iu;   // mots entiers : « situer » ne compte pas

  const used = new Set();
  let nTag = 0;
  for (const qid of qids) {
    const q = full[qid], d = data.quetes[qid];
    if (!q) continue;
    const tg = new Set(), lines = [], disco = [], dj = new Set();
    if (q.isDungeonQuest) tg.add('dj');
    for (const s of q.steps) for (const o of s.objectives) {
      const g = (o.need && o.need.generated) || {};
      (g.dungeons || []).forEach(id => dj.add(id));
      const c = o.className, txt = clean(fr(o.text));
      if (FIGHT.test(c)) { tg.add('cb'); lines.push(txt); }
      else if (c === 'QuestObjectiveBringSoulToNpcData') { tg.add('fm'); lines.push(txt); }
      else if (c === 'QuestObjectiveCraftItemData') { tg.add('cr'); lines.push(txt); }
      else if (c === 'QuestObjectiveBringItemToNpcData') {
        (g.items || []).forEach((id, i) => {
          const it = items[id]; if (!it) return;
          const farm = (it.dropMonsterIds || []).length > 0;
          if (it.hasRecipe && !farm) tg.add('cr'); else tg.add('fm');
          lines.push(`Rapporter ${(g.quantities || [])[i] || 1} × ${fr(it.name)}`);
        });
      }
      else if (c === 'QuestObjectiveDiscoverMapData' || c === 'QuestObjectiveDiscoverSubAreaData') { tg.add('ex'); disco.push(txt); }
      else if (c === 'QuestObjectiveFreeFormData') { if (txt) { lines.push(txt); if (COMBAT_WORDS.test(txt)) tg.add('cb'); } }
      // « Aller voir un PNJ » : trop courant pour être utile
    }
    // cartes à découvrir : listées si peu nombreuses, sinon résumées
    if (disco.length > 3) lines.push(`Découvrir ${disco.length} cartes ou zones`); else lines.push(...disco);
    if (dj.size) tg.add('dj');
    // exploration seule = sans intérêt si la quête fait autre chose : on la garde quand même comme étiquette
    // « Rapporter 1 âme de X » répété pour beaucoup de monstres (L'éternelle moisson : 337) : une seule ligne
    const SOUL = /^Rapporter \d+ âme de /, souls = lines.filter(l => SOUL.test(l));
    if (souls.length > 5) { const i = lines.findIndex(l => SOUL.test(l)); lines.splice(i, 0, `Rapporter l’âme de ${souls.length} monstres différents`); for (let j = lines.length - 1; j > i; j--) if (SOUL.test(lines[j])) lines.splice(j, 1); }
    const seen = new Set(), uniq = lines.filter(l => l && !seen.has(l) && seen.add(l));
    d.tg = [...tg]; if (!d.tg.length) delete d.tg;
    if (q.type) d.ty = q.type;                                         // 0 normale, 1 / 2 anneau vert / jaune, 3 étoile (icônes du jeu)
    if (q.levelMax && q.levelMax !== q.levelMin) d.lx = q.levelMax;    // « Niv. 40-200 »
    d.dj = [...dj]; if (!d.dj.length) delete d.dj; else d.dj.forEach(id => used.add(id));
    if (uniq.length) d.ft = uniq;   // liste complète, sans « … et N autres »
    else delete d.ft;
    if (d.tg) nTag++;
  }
  // PNJ qui remettent certains Dofus : absents de DofusDB, à renseigner à la main si besoin, ex. { 27803: 'Gobdepin (Albuera)' }
  const DOFUS_PNJ = {};
  for (const z of data.dofus || []) { if (DOFUS_PNJ[z.id]) z.pnj = DOFUS_PNJ[z.id]; }
  data.donjons = Object.fromEntries([...used].sort((a, b) => a - b).map(id => { const g = dungeons[id] || {};
    return [id, { n: fr(g.name) || `Donjon ${id}`, lv: g.optimalPlayerLevel || 0, b: (g.bosses || []).map(b => fr((monsters[b] || {}).name)).filter(Boolean) }]; }));
  fs.writeFileSync(FILE, JSON.stringify(data));
  const cnt = {};
  for (const d of Object.values(data.quetes)) for (const t of d.tg || []) cnt[t] = (cnt[t] || 0) + 1;
  console.log(`${nTag} / ${qids.length} quêtes étiquetées`, cnt, `· ${used.size} donjons`, `· ${(fs.statSync(FILE).size / 1024).toFixed(0)} Ko`);
}

module.exports = { run };
if (require.main === module) run(createClient(), process.argv[2] || 'data/dofusdb.json').catch(e => { console.error(e); process.exit(1); });
