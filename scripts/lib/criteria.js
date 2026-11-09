// Lecture des critères DofusDB (chaînes comme « PL>19&Qf=12&(OA=5|OA=6) »). Fonctions pures, testées.

// Critère d'un objectif de succès : Qf=ID → quête terminée, OA=ID → succès obtenu, sinon autre (monstre, donjon, niveau…)
// « Qf=12 » et « QF>12,0 » (quête 12 terminée au moins une fois) disent la même chose ; DofusDB emploie les deux.
const normalize = c => String(c || '').replace(/QF>(\d+),0/g, 'Qf=$1');

function parseObjective(c) {
  c = normalize(c);
  let m;
  if ((m = c.match(/Qf=(\d+)/))) return { t: 'q', r: +m[1] };
  if ((m = c.match(/OA=(\d+)/))) return { t: 'a', r: +m[1] };
  return { t: 'x' };
}

// Conditions de départ d'une quête (startCriterion) : { pre: quêtes à avoir terminées, preA: succès à avoir obtenus, po: objets à posséder,
//   en: quêtes qui doivent être en cours, ob: objectifs de quête à avoir achevés, pl: niveau à dépasser (PL>179 → 179, sinon null) }.
// Qf=X → la quête X doit être terminée ; OA=Y → le succès Y doit être obtenu ; PO=Z → posséder l'objet Z ;
// Qa=X → la quête X doit être en cours ; Qo>O (ou Qo=O) → l'objectif O doit être achevé ; PL>N → niveau supérieur à N.
// Les alternatives « a|b » sont ignorées, sauf quand une même quête figure dans toutes : elle est alors exigée.
function parseStart(c) {
  c = normalize(c);
  const pre = new Set(), preA = new Set(), po = new Set(), en = new Set(), ob = new Set();
  let pl = null;
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
    if ((m = part.match(/PO=(\d+)/))) po.add(+m[1]);   // posséder un objet (filtré ensuite sur les Dofus)
    if ((m = part.match(/Qa=(\d+)/))) en.add(+m[1]);
    if ((m = part.match(/Qo[=>](\d+)/))) ob.add(+m[1]);
    if ((m = part.match(/PL>(\d+)/))) pl = Math.max(pl ?? 0, +m[1]);
  }
  return { pre: [...pre], preA: [...preA], po: [...po], en: [...en], ob: [...ob], pl };
}

module.exports = { parseObjective, parseStart };
