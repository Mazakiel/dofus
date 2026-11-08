// ===== Récompenses : Dofus, titres et ornements — listes, fiches et objectifs.
// Un Dofus, un titre et un ornement se suivent de la même façon : une source (le succès ou la quête qui le donne), un état « obtenu » et une case objectif.
// Un Dofus peut être forcé à la main ; un titre ou un ornement n'a pas d'état propre : il est obtenu quand son succès l'est.
// Dans la page, un Dofus est l'objet de `SDZ` (sans `kind`) ; un titre ou un ornement est une entrée de `RW` { kind: 't' | 'o', id, n, a (succès), i (icône d'ornement) }.
const { RW, RWBY } = P.index;
const { rwGoals } = P.state;
let rKind = store.get('rKind', 'd');   // sous-vue : 'd' Dofus | 't' titres | 'o' ornements
let rCat = store.get('rCat', SALL);    // entrée du menu : SALL (tous) ou une entrée de catégories (titres et ornements)
const RW_KINDS = [['d', 'Dofus', 'Tous les Dofus'], ['t', 'Titres', 'Tous les titres'], ['o', 'Ornements', 'Tous les ornements']];
const rwKey = r => r.kind || 'd';
const rwOf = (k, id) => k === 'd' ? SDZ[id] : (RWBY[k] || {})[id];
const rwVisible = r => r.kind ? !!SACH[r.a] && sVisible(SACH[r.a]) : sdzVisible(r);
const rwOwned = r => P.rewardOwned(r);
const rwIsGoal = r => r.kind ? rwGoals.has(r.kind + r.id) : sdzGoals.has(r.id);
function rwSetGoal(r, on) { const set = r.kind ? rwGoals : sdzGoals, key = r.kind ? r.kind + r.id : r.id; if (on) set.add(key); else set.delete(key); }
// 'done' obtenu · 'av' à obtenir (le succès est faisable, ou Dofus) · 'lock' son succès est indisponible
const rwStatus = r => rwOwned(r) ? 'done' : (!r.kind || P.achDoable(r.a)) ? 'av' : 'lock';   // un méta-succès est « à obtenir » dès qu'un de ses sous-succès est faisable
const rwShown = r => r.kind ? (achDone(r.a) ? sShowDone : (sShowLocked || P.achDoable(r.a))) : (sShowDone || !sdzOwned(r));   // mêmes cases que les autres listes
const rwAll = kind => kind === 'd' ? SDZ_ORDER.filter(sdzVisible)
  : RW.filter(r => r.kind === kind && rwVisible(r)).sort((x, y) => (SACH[x.a].lv || 0) - (SACH[y.a].lv || 0) || x.n.localeCompare(y.n, 'fr'));
const rwInCat = (r, cid) => cid === SALL || (!!r.kind && catIds(cid).includes(SACH[r.a].c));
const rwNeeds = r => r.kind ? collectPrereqs('rw', r.a) : collectPrereqs('d', r.id);

// Entrées du menu de gauche pour la sous-vue courante
function rwCats() {
  const all = rwAll(rKind), l = [];
  l.push({ id: SALL, n: RW_KINDS.find(k => k[0] === rKind)[2] });
  if (rKind !== 'd') for (const m of SC.menu || []) l.push({ id: m.id, n: m.n });
  return l.map(c => { const list = all.filter(r => rwInCat(r, c.id)); return { ...c, total: list.length, done: list.filter(rwOwned).length, shown: list.filter(rwShown).length }; })
    .filter(c => c.id === SALL || c.id === rCat || c.shown);
}
function ensureRw() { if (!rwCats().some(c => c.id === rCat)) rCat = SALL; }
function renderRwTree() {
  const cats = rwCats(), cur = cats.find(c => c.id === rCat) || cats[0];
  document.getElementById('catBtn').innerHTML = `<span class="cb-n">${esc(cur.n)}</span><span class="pct">${pctOf(cur.done, cur.total)} %</span><span aria-hidden="true">▾</span>`;
  document.getElementById('scTree').innerHTML = cats.map(c => `<div class="sc-cat${rCat === c.id ? ' sel' : ''}${c.total && c.done === c.total ? ' full' : ''}" data-rcat="${c.id}" title="${c.done} / ${c.total}"><span>${esc(c.n)}</span><span class="rt"><span class="pct">${pctOf(c.done, c.total)}%</span></span></div>`).join('');
}

// Ligne d'un titre ou d'un ornement
function rwRow(r) {
  const st = rwStatus(r), a = SACH[r.a], [d, n] = achProg(a), goal = rwIsGoal(r) && st !== 'done';
  const stLbl = { done: 'Obtenu', av: 'À obtenir : son succès est faisable', lock: 'Indisponible : son succès ne l’est pas encore' }[st];
  return `<div class="row rw-row${st === 'done' ? ' done' : ''}${goal ? ' goal' : ''}${isPick(r.kind, r.id) ? ' sel' : ''}" data-pick="${r.kind}:${r.id}" tabindex="0" role="button">
    <span class="rdot ${st}" title="${stLbl}"></span>${rwIcon(r, 'rw-ic')}
    <div style="min-width:0"><div class="t">${esc(r.n)}</div><div class="m">Succès « ${esc(a.n)} »</div></div>
    <div class="r">${n > 1 ? `<span class="lv">${d} / ${n}</span>` : ''}${st === 'done' ? '' : goalBtn(r, goal)}</div>
  </div>`;
}
const goalBtn = (r, on) => `<button type="button" class="tgt${on ? ' on' : ''}" data-rgoal="${rwKey(r)}:${r.id}" aria-pressed="${on}" title="${on ? 'Retirer des objectifs' : 'En faire un objectif'}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg></button>`;

function renderRwMain(el) {
  const seg = `<div class="seg" role="group" aria-label="Type de récompense">${RW_KINDS.map(([k, l]) => `<button type="button" class="seg-b" data-rkind="${k}" aria-pressed="${rKind === k}">${l}</button>`).join('')}</div>`;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), qn = norm(sSearch.trim());
  const all = rwAll(rKind), cats = rwCats();
  const list = qn ? all.filter(r => norm(r.n).includes(qn) || (r.kind && norm(SACH[r.a].n).includes(qn))) : all.filter(r => rwInCat(r, rCat));
  const title = qn ? `Recherche « ${esc(sSearch)} »` : esc((cats.find(c => c.id === rCat) || cats[0]).n);
  const shown = list.filter(rwShown), d = list.filter(rwOwned).length;
  const parcours = rKind === 'd' && !qn;   // les Dofus se lisent en parcours ; une recherche affiche les résultats en grille
  const body = rKind === 'd' ? (parcours ? parcoursHtml() : `<div class="dz-grid">${shown.map(dofusCard).join('')}</div>`) : shown.map(rwRow).join('');
  const goalBtnHead = GOALR.length ? `<button class="btn" data-goalview title="${esc(goalSummary())} : les quêtes à faire">Mes objectifs (${GOALR.length})</button>` : '';
  el.innerHTML = seg + head(title, `${d} / ${list.length} obtenus (${pctOf(d, list.length)} %) · ${plural(shown.length, 'affiché')}`, goalBtnHead)
    + (shown.length ? body : EMPTY);
  imgErr(el);
  document.body.classList.toggle('pc-wide', parcours);   // le parcours prend toute la largeur : la fiche passe en tiroir
  if (parcours) { pDrawEdges(); pWatch(); }
}

// Fiche d'un Dofus, d'un titre ou d'un ornement
function rwDetailHtml(r) {
  const k = rwKey(r), own = rwOwned(r), st = rwStatus(r), goal = rwIsGoal(r), a = r.kind ? SACH[r.a] : null;
  const lvl = !r.kind && SDZLV[r.id] ? ` · niveau ${SDZLV[r.id][0] === SDZLV[r.id][1] ? SDZLV[r.id][0] : SDZLV[r.id].join(' à ')}` : '';
  const big = r.kind === 't' ? `<span class="rw-ti big">${RIBBON}</span>` : rwIcon(r, 'rw-big');
  const achLine = id => { const s = SACH[id]; if (!s) return ''; const [d, n] = achProg(s), dn = achDone(id);
    return `<div class="ob${dn ? ' done' : ''}">${okx(dn)}<span>Succès <span class="sgo" data-pick="a:${id}">${esc(s.n)}</span></span>${n > 1 ? `<span class="lv">${d} / ${n}</span>` : ''}</div>`; };
  const questLine = id => SC.quetes[id] ? `<div class="ob${qDoneS(id) ? ' done' : ''}">${okx(qDoneS(id))}<span>Quête <span class="sgo" data-pick="q:${id}">${esc(qName(id))}</span></span><span class="lv">${lvTxt(SC.quetes[id])}</span></div>` : '';
  let src;
  if (r.kind) src = achLine(r.a);
  else {
    src = [r.a && !r.pre ? achLine(r.a) : '', ...(r.pa || []).map(achLine), questLine(r.q), ...(r.pq || []).map(questLine)].join('');
    if (!src && !Array.isArray(r.pnj)) src = `<div class="quote">${esc(dzWho(r))}</div>`;
  }
  // Dofus qui s'achète à un PNJ : où (la position se copie en commande /travel)
  const vendors = Array.isArray(r.pnj) ? `<div class="lab">S’achète auprès de</div>${r.pnj.map(p => `<div class="ob"><span class="x">•</span><span>${esc(p.n)}</span><span class="lv">${coordBtn(p)}</span></div>`).join('')}` : '';
  const acc = own ? null : rwNeeds(r), avail = acc ? [...acc.q].filter(q => qStatus(q) === 'av').length : 0;
  const left = acc && (acc.q.size || acc.a.size) ? `${[acc.q.size ? plural(acc.q.size, 'quête') : '', acc.a.size ? plural(acc.a.size, 'succès', 'succès') : ''].filter(Boolean).join(' et ')} à faire${avail ? `, dont ${plural(avail, 'quête')} disponible${avail > 1 ? 's' : ''}` : ''}` : '';
  return `<div class="hd">${big}<h3>${esc(r.n)}${copyBtn(r.n)}</h3><div class="k">${rwKindLbl(r)}${lvl}${a ? ' · donné par un succès' : ''}</div></div>
    <div class="stat"><span class="badge ${st}">${st === 'done' ? 'Obtenu' : st === 'lock' ? 'Indisponible' : 'À obtenir'}</span></div>
    <div class="acts prog">${own ? '' : `<button class="btn" data-rgoal="${k}:${r.id}" aria-pressed="${goal}">Objectif</button>`}${r.kind ? '' : `<button class="btn" data-sdzown="${r.id}" aria-pressed="${own}">Obtenu</button>`}</div>
    ${a && a.d ? `<div class="quote${own ? ' ok' : ''}">${esc(a.d)}</div>` : ''}
    ${src ? `<div class="lab">Pour l’obtenir</div>${src}` : ''}${vendors}
    ${left ? `<div class="lab">Il reste</div><div class="ob"><span>${left}</span></div>${fluxHtml(acc.q, r.n)}` : ''}
    ${a ? `<div class="path">${esc(catPath(a.c))}</div>` : ''}
    <div class="ddb-row">${r.kind ? ddbLink('a', r.a, 'Succès sur DofusDB') : ddbLink('d', r.id)}</div>`;
}
