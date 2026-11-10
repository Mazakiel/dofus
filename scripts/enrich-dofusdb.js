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
  // salles des donjons (cartes intérieures, porte, sous-zone) : de quoi dire dans quelle salle se fait un objectif
  const roomsOf = await client.cached('dungeons-rooms.json', () => client.byIds('dungeons', Object.keys(dungeons).map(Number), ['id', 'mapIds', 'entranceMapId', 'exitMapId', 'subarea']));
  const objMaps = new Set();
  for (const q of Object.values(full)) for (const s of q.steps) for (const o of s.objectives) if (o.mapId && ((o.need && o.need.generated && o.need.generated.dungeons) || []).length) objMaps.add(o.mapId);
  const mapRooms = await client.cached('map-rooms.json', () => client.byIds('map-positions', [...objMaps], ['id', 'subAreaId', 'name']));
  const mapMiss = [...objMaps].filter(id => !mapRooms[id]);
  if (mapMiss.length) { Object.assign(mapRooms, await client.byIds('map-positions', mapMiss, ['id', 'subAreaId', 'name'])); client.cache.write('map-rooms.json', mapRooms); }
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
  const fixDj = (JSON.parse(fs.existsSync(fixFile) ? fs.readFileSync(fixFile, 'utf8') : '{}').donjons) || {};
  const applyFixes = (qid, lines) => {
    const fx = fixes[qid] && fixes[qid].dansDonjon; if (fx === undefined) return;
    if (fixes[qid].donjon) lines.forEach(l => { if (!l.d) l.d = fixes[qid].donjon; });   // donjon d'une ligne que DofusDB ne rattache à aucun
    if (fx === 'tout' || fx === 'rien') { lines.forEach(l => { l.dj = fx === 'tout'; }); return; }
    for (const t of fx) { const l = lines.find(x => x.t === t); if (l) l.dj = true; else console.warn(`correction obsolète : quête ${qid}, ligne introuvable « ${t} »`); }
  };

  // Salle d'un objectif dans un donjon : nom de la carte sans le nom du donjon (« Serre du Royalmouth - Sixième salle » → « Sixième salle »)
  const plain = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const PORTE = 'Porte du donjon', SANS = 'Salle non précisée', HORS = 'Hors du donjon';
  function roomLabel(dId, mapId) {
    if (!mapId) return SANS;
    const r = roomsOf[dId] || {}, g = dungeons[dId] || {}, m = mapRooms[mapId] || {}, name = fr(m.name), dn = fr(g.name);
    const byName = name && dn && plain(name).startsWith(plain(dn));
    const inside = (r.mapIds || []).includes(mapId) || (r.subarea && m.subAreaId === r.subarea) || byName;
    if (!inside) return [r.entranceMapId, r.exitMapId].includes(mapId) ? PORTE : HORS;
    const cut = byName ? name.slice(dn.length).replace(/^\s*[-–:]\s*/, '').trim() : '';
    return cut || name || 'Salle ' + mapId;
  }
  const ORD = ['premiere', 'deuxieme', 'troisieme', 'quatrieme', 'cinquieme', 'sixieme', 'septieme', 'huitieme', 'neuvieme', 'dixieme', 'onzieme', 'douzieme', 'treizieme', 'quatorzieme', 'quinzieme', 'seizieme'];
  function roomRank(l) {
    if (l === PORTE) return 0; if (l === SANS) return 1000; if (l === HORS) return 1100;
    const p = plain(l), n = ORD.findIndex(w => p.includes(w));
    if (n >= 0) return 100 + n * 10;
    if (/antichambre|entree|hall|vestibule/.test(p)) return 10;
    if (/sortie/.test(p)) return 900;
    if (/trone|derniere salle|boss|repaire/.test(p)) return 800;
    return 500;
  }
  // Genre d'une ligne rattachée à un donjon : d = « faire le donjon » (tuer le boss, butin du boss, salle finale), a = action de salle,
  // p = action à faire après le boss (à ne pas manquer avant de sortir), x = hors du détail du donjon (rapporter à un PNJ, hors du donjon).
  const bossesOf = id => (dungeons[id] && dungeons[id].bosses) || [];
  function lineKind(l, room) {
    const c = l.c, boss = bossesOf(l.d);
    if (FIGHT.test(c) && boss.includes(l.mon)) return 'd';   // le combat du boss compte même si DofusDB le place sur une carte hors du donjon
    if (room === HORS) return 'x';
    if (FIGHT.test(c)) return 'a';
    // rapporter à un PNJ : lié à la quête, hors du détail du donjon, sauf quand il se fait dans une salle du donjon (ex. « avant de sortir, rends le guide au PNJ »)
    const inRoom = ![HORS, SANS].includes(room);
    if (c === 'QuestObjectiveBringSoulToNpcData') return inRoom ? 'a' : 'x';
    if (c === 'QuestObjectiveBringItemToNpcData') return l.it.some(id => ((items[id] || {}).dropMonsterIds || []).some(m => boss.includes(m))) ? 'd' : inRoom ? 'a' : 'x';
    if (c === 'QuestObjectiveDiscoverMapData') return /sortie|derni[eè]re salle/i.test(l.t) ? 'd' : 'x';   // découvrir une salle intermédiaire : jalon sans intérêt dans le détail
    if (c === 'QuestObjectiveFreeFormData') return COMBAT_WORDS.test(l.t) ? 'd' : 'a';
    return 'a';
  }
  // Corrections par ligne (data/dofusdb-fixes.json › quetes › id › lignes : [{ i, t, salle, genre }]) : i = numéro de la ligne de « À faire », t = son texte (garde-fou)
  const applyLineFixes = (qid, lines) => {
    for (const f of (fixes[qid] && fixes[qid].lignes) || []) {
      const l = lines[f.i];
      if (!l || (f.t && l.t !== f.t)) { console.warn(`correction obsolète : quête ${qid}, ligne ${f.i} « ${f.t} »`); continue; }
      if (f.salle) l.room = f.salle; if (f.genre) l.k = f.genre; if (f.donjon) l.d = f.donjon;
    }
  };
  const roomHits = [];   // { qid, i (ligne de ft), d (donjon), l (salle), k (genre) }

  // Objectifs de quête exigés au départ d'une autre quête (Qo>id) : quête et texte de l'objectif
  const objIndex = new Map();
  for (const q of Object.values(full)) for (const s of q.steps) for (const o of s.objectives) objIndex.set(o.id, { q: q.id, t: clean(fr(o.text)) });

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
      if (txt) lines.push({ t: txt, dj: !!(g.dungeons || []).length, d: (g.dungeons || [])[0], m: o.mapId || 0, c, mon: o.parameters && o.parameters.parameter0, it: g.items || [] });
    }
    if (dj.size) tg.add('dj');
    // « Rapporter 1 âme de X » répété pour beaucoup de monstres (L'éternelle moisson : 337) : une seule ligne
    const SOUL = /^Rapporter \d+ âmes? de /, souls = lines.filter(l => SOUL.test(l.t));
    if (souls.length > 5) { const i = lines.findIndex(l => SOUL.test(l.t)); lines.splice(i, 0, { t: `Rapporter l’âme de ${souls.length} monstres différents`, dj: souls.every(l => l.dj), c: 'QuestObjectiveBringSoulToNpcData' }); for (let j = lines.length - 1; j > i; j--) if (SOUL.test(lines[j].t)) lines.splice(j, 1); }
    applyFixes(qid, lines);
    if (fixes[qid] && fixes[qid].donjon) dj.add(fixes[qid].donjon);
    // salle et genre de chaque ligne rattachée à un donjon ; « après le boss » : une action qui suit, dans la quête, le combat du boss du même donjon
    for (const l of lines) if (l.dj && l.d) { l.rl = roomLabel(l.d, l.m); l.k = lineKind(l, l.rl); }
    for (const l of lines) if (l.dj && l.d && l.k === 'd' && FIGHT.test(l.c || '')) l.boss = true;
    lines.forEach((l, i) => { if (l.k === 'a' && lines.slice(0, i).some(b => b.boss && b.d === l.d)) l.k = 'p'; });
    applyLineFixes(qid, lines);
    d.tg = [...tg]; if (!d.tg.length) delete d.tg;
    // début : « PNJ · [x,y] · zone » (jusqu'à 3 endroits) ; les maps d'intérieur (worldMap -1) donnent les coordonnées de l'extérieur
    const sp = ((q.startPosition || []).map(p => { const m = maps[p.mapId], n = npcs[p.npcId]; if (!m && !n) return null;
      return { n: fr(n && n.name), ...(m ? { x: m.posX, y: m.posY } : {}), ...(m && subareas[m.subAreaId] ? { z: fr(subareas[m.subAreaId].name) } : {}) }; }).filter(Boolean)).slice(0, 3);
    if (sp.length) d.sp = sp; else delete d.sp;
    if (q.type) d.ty = q.type;                                         // 0 normale, 1 / 2 anneau vert / jaune, 3 étoile (icônes du jeu)
    if (q.levelMax && q.levelMax !== q.levelMin) d.lx = q.levelMax;    // « Niv. 40-200 »
    d.dj = [...dj]; if (!d.dj.length) delete d.dj; else d.dj.forEach(id => used.add(id));
    delete d.fr;
    if (d.ob) { const po = d.ob.map(id => objIndex.get(id)).filter(Boolean).map(x => [x.q, x.t]); if (po.length) d.preO = po; else delete d.preO; } else delete d.preO;
    if (lines.length) d.ft = lines.map(l => l.t); else delete d.ft;   // liste complète, sans « … et N autres »
    lines.forEach((l, i) => { if (l.dj && l.d) { const nom = l.room || l.rl, ren = (fixDj[l.d] && fixDj[l.d].noms) || {}; roomHits.push({ qid, i, d: l.d, l: ren[nom] || nom, k: l.k }); } });
    const fd = lines.flatMap((l, i) => l.dj ? [i] : []);              // indices des lignes de `ft` à faire dans un donjon
    if (fd.length) d.fd = fd; else delete d.fd;
    if (d.tg) nTag++;
  }
  // Salles de chaque donjon, dans l'ordre : réglage manuel (data/dofusdb-fixes.json › donjons › id › salles) puis rang déduit du nom
  const slOf = {};
  for (const id of new Set(roomHits.map(h => h.d))) {
    const labels = [...new Set(roomHits.filter(h => h.d === id && (h.k === 'a' || h.k === 'p')).map(h => h.l))], manual = (fixDj[id] && fixDj[id].salles) || [];
    const pos = l => { const k = manual.indexOf(l); return k >= 0 ? -1000 + k : roomRank(l); };
    slOf[id] = labels.sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, 'fr'));
  }
  for (const h of roomHits) { const d = data.quetes[h.qid]; (d.fr = d.fr || []).push([h.i, h.d, (slOf[h.d] || []).indexOf(h.l), h.k]); }   // fr : [ligne de ft, donjon, salle (-1 : hors du détail), genre d / a / p / x]
  // PNJ qui remettent certains Dofus : absents de DofusDB, à renseigner à la main si besoin, ex. { 27803: 'Gobdepin (Albuera)' }
  const DOFUS_PNJ = {};
  for (const z of data.dofus || []) { if (DOFUS_PNJ[z.id]) z.pnj = DOFUS_PNJ[z.id]; }
  roomHits.forEach(h => used.add(h.d));
  data.donjons = Object.fromEntries([...used].sort((a, b) => a - b).map(id => { const g = dungeons[id] || {};
    return [id, { n: fr(g.name) || `Donjon ${id}`, lv: g.optimalPlayerLevel || 0, b: (g.bosses || []).map(b => fr((monsters[b] || {}).name)).filter(Boolean), ...(slOf[id] ? { sl: slOf[id] } : {}), ...(fixDj[id] && fixDj[id].sortieLibre ? { lib: 1 } : {}) }]; }));
  fs.writeFileSync(FILE, JSON.stringify(data));
  const cnt = {};
  for (const d of Object.values(data.quetes)) for (const t of d.tg || []) cnt[t] = (cnt[t] || 0) + 1;
  console.log(`${nTag} / ${qids.length} quêtes étiquetées`, cnt, `· ${used.size} donjons`, `· ${(fs.statSync(FILE).size / 1024).toFixed(0)} Ko`);
}

module.exports = { run };
if (require.main === module) run(createClient(), process.argv[2] || 'data/dofusdb.json').catch(e => { console.error(e); process.exit(1); });
