// Enrichit data/dofusdb.json avec, pour chaque quête : étiquettes (donjon, combat, farm, craft, exploration),
// donjons concernés et liste lisible de ce qu'il y a à faire. Source : DofusDB uniquement.
// Usage : node scripts/enrich-dofusdb.js data/dofusdb.json   (réécrit le fichier ; à relancer après fetch-dofusdb.js)
const fs = require('fs'), path = require('path');
const { createClient } = require('./lib/dofusdb.js');
const fr = n => (n && (n.fr || n.en)) || '';

async function run(client, FILE) {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const qids = Object.keys(data.quetes);

  // 1. quêtes complètes (étapes + objectifs)
  const full = await client.cached('quetes-full.json', () => client.byIds('quests', qids, [], { chunk: 20 }));
  // un cache plus ancien que les données ne connaît pas les quêtes ajoutées depuis : on les complète
  const missing = qids.filter(id => !full[id]);
  if (missing.length) { Object.assign(full, await client.byIds('quests', missing, [], { chunk: 20 })); client.cache.write('quetes-full.json', full); }

  // 2. identifiants à résoudre : objets, monstres, zones
  const want = { item: new Set(), monster: new Set(), subarea: new Set(), npc: new Set() };
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

  // Début des quêtes : PNJ à qui parler et position sur la carte (DofusDB : startPosition = [{ mapId, npcId }])
  const npcIds = new Set(), mapIds = new Set();
  for (const qid of qids) for (const p of (full[qid] && full[qid].startPosition) || []) { if (p.npcId) npcIds.add(p.npcId); if (p.mapId) mapIds.add(p.mapId); }
  want.npc.forEach(id => npcIds.add(id));   // PNJ cités par les objectifs (« Aller voir … », « Ramener à … »)
  const npcs = await client.cached('npcs-min.json', () => client.byIds('npcs', [...npcIds], ['id', 'name']));
  const maps = await client.cached('maps-min.json', () => client.byIds('map-positions', [...mapIds], ['id', 'posX', 'posY', 'subAreaId', 'worldMap']));
  for (const [kind, store, ids, sel] of [['npcs', npcs, npcIds, ['id', 'name']], ['map-positions', maps, mapIds, ['id', 'posX', 'posY', 'subAreaId', 'worldMap']]]) {
    const miss = [...ids].filter(id => !store[id]);
    if (miss.length) { Object.assign(store, await client.byIds(kind, miss, sel)); client.cache.write(`${kind === 'map-positions' ? 'maps' : kind}-min.json`, store); }
  }
  const zoneMiss = [...new Set(Object.values(maps).map(m => m.subAreaId))].filter(id => id != null && !subareas[id]);
  if (zoneMiss.length) Object.assign(subareas, await client.byIds('subareas', zoneMiss, ['id', 'name']));

  const nameOf = { item: id => fr((items[id] || {}).name), monster: id => fr((monsters[id] || {}).name), subarea: id => fr((subareas[id] || {}).name), npc: id => fr((npcs[id] || {}).name) };
  const clean = t => t
    .replace(/ sur la carte \{map,\d+(?:::[^}]*)?\}/g, '')
    .replace(TOK, (m, k, id) => (nameOf[k] ? nameOf[k](+id) : '') || '')
    .replace(/\s+en un seul combat/, '')
    .replace(/^Vaincre x(\d+) (.+)$/, (m, n, nom) => +n > 1 ? `Vaincre ${n} × ${nom}` : `Vaincre ${nom}`)
    .replace(/^Découvrir la carte ?:/, 'Découvrir la carte :')
    .replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
  const FIGHT = /^QuestObjective(Multi)?FightMonster|FightMonstersOnMap/;
  const COMBAT_WORDS = /(?<![\p{L}])(vaincre|neutralis\w*|affronter|éliminer|tuer)(?![\p{L}])/iu;   // mots entiers : « situer » ne compte pas

  // Corrections manuelles des trous de DofusDB (data/dofusdb-fixes.json, à côté du fichier de données)
  const fixFile = path.join(path.dirname(FILE), 'dofusdb-fixes.json');
  const fixes = (fs.existsSync(fixFile) ? JSON.parse(fs.readFileSync(fixFile, 'utf8')).quetes : null) || {};
  const applyFixes = (qid, lines) => {
    const fx = fixes[qid] && fixes[qid].dansDonjon; if (fx === undefined) return;
    if (fx === 'tout' || fx === 'rien') { lines.forEach(l => { l.dj = fx === 'tout'; }); return; }
    for (const t of fx) { const l = lines.find(x => x.t === t); if (l) l.dj = true; else console.warn(`correction obsolète : quête ${qid}, ligne introuvable « ${t} »`); }
  };

  const used = new Set();
  let nTag = 0;
  for (const qid of qids) {
    const q = full[qid], d = data.quetes[qid];
    if (!q) continue;
    const tg = new Set(), lines = [], dj = new Set();
    if (q.isDungeonQuest) tg.add('dj');
    // une ligne par objectif, dans l'ordre de DofusDB ; `dj` : l'objectif se fait dans un donjon (même règle que le site : need.generated.dungeons non vide)
    for (const s of q.steps) for (const o of s.objectives) {
      const g = (o.need && o.need.generated) || {};
      (g.dungeons || []).forEach(id => dj.add(id));
      const c = o.className, txt = clean(fr(o.text));
      if (FIGHT.test(c)) tg.add('cb');
      else if (c === 'QuestObjectiveBringSoulToNpcData') tg.add('fm');
      else if (c === 'QuestObjectiveCraftItemData') tg.add('cr');
      else if (c === 'QuestObjectiveBringItemToNpcData') {
        (g.items || []).forEach(id => {
          const it = items[id]; if (!it) return;
          if (it.hasRecipe && !(it.dropMonsterIds || []).length) tg.add('cr'); else tg.add('fm');
        });
      }
      else if (c === 'QuestObjectiveDiscoverMapData' || c === 'QuestObjectiveDiscoverSubAreaData') tg.add('ex');
      else if (c === 'QuestObjectiveFreeFormData' && COMBAT_WORDS.test(txt)) tg.add('cb');
      if (txt) lines.push({ t: txt, dj: !!(g.dungeons || []).length });
    }
    if (dj.size) tg.add('dj');
    // « Rapporter 1 âme de X » répété pour beaucoup de monstres (L'éternelle moisson : 337) : une seule ligne
    const SOUL = /^Rapporter \d+ âmes? de /, souls = lines.filter(l => SOUL.test(l.t));
    if (souls.length > 5) { const i = lines.findIndex(l => SOUL.test(l.t)); lines.splice(i, 0, { t: `Rapporter l’âme de ${souls.length} monstres différents`, dj: souls.every(l => l.dj) }); for (let j = lines.length - 1; j > i; j--) if (SOUL.test(lines[j].t)) lines.splice(j, 1); }
    applyFixes(qid, lines);
    d.tg = [...tg]; if (!d.tg.length) delete d.tg;
    // début : « PNJ · [x,y] · zone » (jusqu'à 3 endroits) ; les maps d'intérieur (worldMap -1) donnent les coordonnées de l'extérieur
    const sp = ((q.startPosition || []).map(p => { const m = maps[p.mapId], n = npcs[p.npcId]; if (!m && !n) return null;
      return { n: fr(n && n.name), ...(m ? { x: m.posX, y: m.posY } : {}), ...(m && subareas[m.subAreaId] ? { z: fr(subareas[m.subAreaId].name) } : {}) }; }).filter(Boolean)).slice(0, 3);
    if (sp.length) d.sp = sp; else delete d.sp;
    if (q.type) d.ty = q.type;                                         // 0 normale, 1 / 2 anneau vert / jaune, 3 étoile (icônes du jeu)
    if (q.levelMax && q.levelMax !== q.levelMin) d.lx = q.levelMax;    // « Niv. 40-200 »
    d.dj = [...dj]; if (!d.dj.length) delete d.dj; else d.dj.forEach(id => used.add(id));
    if (lines.length) d.ft = lines.map(l => l.t); else delete d.ft;   // liste complète, sans « … et N autres »
    const fd = lines.flatMap((l, i) => l.dj ? [i] : []);              // indices des lignes de `ft` à faire dans un donjon
    if (fd.length) d.fd = fd; else delete d.fd;
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
