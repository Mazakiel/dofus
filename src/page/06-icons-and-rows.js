// ===== Icônes, étiquettes et lignes : jeu d'icônes, statut des quêtes (pastilles), lignes de succès et de quêtes.
// ---------- icônes ----------
const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const IC = {
  t0: SVG('<rect x="9.2" y="2" width="5.6" height="13.8" rx="2.8"/><circle cx="12" cy="20" r="2.8"/>'),
  ring: SVG('<path fill-rule="evenodd" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm0 2.3a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4z"/><rect x="10.6" y="6.3" width="2.8" height="7.2" rx="1.4"/><circle cx="12" cy="16.9" r="1.6"/>'),
  star: SVG('<path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 18.2 5.6 21.7 7 14.5l-5.3-5 7.2-.9z"/>'),
  dj: SVG('<path d="M2 3.5c.3 4.6 2.6 7 5.6 7.5l.5-2.4C5.8 7.6 4.3 6 2 3.5zM22 3.5c-.3 4.6-2.6 7-5.6 7.5l-.5-2.4c2.3-1 3.8-2.6 6.1-5.1z"/><path fill-rule="evenodd" d="M12 6.5c-3.7 0-6.2 2.6-6.2 6 0 2 .9 3.4 2.2 4.3V21h8v-4.2c1.3-.9 2.2-2.3 2.2-4.3 0-3.4-2.5-6-6.2-6zM9.1 11.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zm5.8 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM12 14.8l1.1 2.2h-2.2z"/>'),
  grp: SVG('<circle cx="12" cy="7.2" r="3.4"/><circle cx="4.6" cy="9.4" r="2.5"/><circle cx="19.4" cy="9.4" r="2.5"/><path d="M5.8 21v-3.4a6.2 6.2 0 0 1 12.4 0V21zM.8 19v-1.6a3.6 3.6 0 0 1 3.2-3.6 7.4 7.4 0 0 0-1.6 4.6V19zM23.2 19v-1.6a3.6 3.6 0 0 0-3.2-3.6 7.4 7.4 0 0 1 1.6 4.6V19z"/>'),
  cup: SVG('<path d="M6 2.5h12V9a6 6 0 0 1-5 5.9v2.1h3.2V19.5H18V22H6v-2.5h1.8V17H11v-2.1A6 6 0 0 1 6 9z"/><path d="M6 4.5H2.2v3.2c0 2.6 1.7 4.2 4.2 4.6V10c-1.1-.4-1.7-1.3-1.7-2.7v-.7H6zM18 4.5h3.8v3.2c0 2.6-1.7 4.2-4.2 4.6V10c1.1-.4 1.7-1.3 1.7-2.7v-.7H18z"/>'),
  egg: SVG('<path d="M12 2c4.2 0 7.5 6.3 7.5 11.5A7.5 7.5 0 0 1 12 21a7.5 7.5 0 0 1-7.5-7.5C4.5 8.3 7.8 2 12 2z"/>'),
  sliders: SVG('<rect x="2" y="5.2" width="20" height="2.6" rx="1.3"/><rect x="2" y="10.7" width="20" height="2.6" rx="1.3"/><rect x="2" y="16.2" width="20" height="2.6" rx="1.3"/><circle cx="15.5" cy="6.5" r="3.2" stroke="var(--win)" stroke-width="1.6"/><circle cx="7.5" cy="12" r="3.2" stroke="var(--win)" stroke-width="1.6"/><circle cx="16.5" cy="17.5" r="3.2" stroke="var(--win)" stroke-width="1.6"/>')
};
// type de quête DofusDB : 0 normale, 1 anneau vert, 2 anneau jaune, 3 étoile (à confirmer avec les libellés du jeu)
const QTYPE = { 0: ['t0', IC.t0, 'Quête'], 1: ['t1', IC.ring, 'Quête principale'], 2: ['t2', IC.ring, 'Quête primordiale'], 3: ['t3', IC.star, 'Quête spéciale'] };
// Image avec repli : si elle ne charge pas (DofusDB indisponible), le dessin prend le relais
const iconImg = (src, svg, cls, title) => `<span class="ti fbk ${cls}"${title ? ` title="${esc(title)}"` : ''}><img src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('fb')">${svg}</span>`;
const DBI = f => 'https://dofusdb.fr/icons/' + f;   // icônes du jeu hébergées par DofusDB
const DOFUS_ACH_IC = new Set([458, 459]);   // icônes de succès des Dofus : 458 primordiaux, 459 autres
const qIcon = (q, qid) => {
  const own = qid != null ? (QOWN[qid] || []).map(id => SACH[id]).find(a => a && DOFUS_ACH_IC.has(a.ic)) : null;
  if (own) return iconImg(achImg(own), IC.t0, 'qi t0', `Série du ${own.n}`);
  const ty = q.ty || 0, t = QTYPE[ty] || QTYPE[0];
  if (ty === 3) return iconImg(DBI('starFilled.png'), IC.star, 'qi t3', t[2]);
  return iconImg(DBI('effects/quete.png'), IC.t0, `qi t${ty}${ty ? ' ring' : ''}`, t[2]);   // 1 : anneau vert, 2 : anneau jaune
};
const flagIcon = c => c === 'dj' ? iconImg(DBI('dungeon.png'), IC.dj, 'ri dj', 'Donjon') : iconImg(DBI('quest_grp.png'), IC.grp, 'ri grp', 'Quête de groupe');
const qFlags = q => `${(q.tg || []).includes('dj') ? flagIcon('dj') : ''}${q.grp ? flagIcon('gr') : ''}`;
const lvTxt = q => q.lv ? 'Niv. ' + q.lv + (q.lx ? '-' + q.lx : '') : '';

// ---------- étiquettes ----------
const TAGS = { dj: 'Donjon', cb: 'Combat', fm: 'Farm', cr: 'Craft', ex: 'Exploration', gr: 'Groupe' };
const qTags = q => [...(q.tg || []), ...(q.grp ? ['gr'] : [])];
// donjon et groupe ont leur icône à droite : pas de pastille
const tagsHtml = q => { const t = qTags(q).filter(c => c !== 'dj' && c !== 'gr'); return t.length ? `<div class="tags">${t.map(c => `<span class="tag ${c}">${TAGS[c]}</span>`).join('')}</div>` : ''; };
let sProg = null;  // filtre par avancement : 'av' disponible, 'st' commencé, 'bl' bloqué
const isMobile = () => window.matchMedia('(max-width:700px)').matches;

// ---------- lignes ----------
function achCard(a){
  const dn = achDone(a.id), [d, n] = achProg(a);
  return `<div class="row arow${dn ? ' done' : ''}${GOALA[a.id] ? ' goal' : ''}${isPick('a', a.id) ? ' sel' : ''}" id="ach${a.id}" data-pick="a:${a.id}" tabindex="0" role="button">
    <img src="${achImg(a)}" alt="" loading="lazy" referrerpolicy="no-referrer">
    <div style="min-width:0"><div class="t">${esc(a.n)}</div><div class="m">${esc(a.d)}</div></div>
    <div class="r">${a.pts ? `<span class="pts" title="Points de succès">${a.pts}${iconImg(DBI('icon_cup.png'), IC.cup, 'cup', '')}</span>` : ''}${goalIcons(GOALA[a.id])}${dzIcons(notGoal(DZ_REW_A[a.id], GOALA[a.id]))}${n > 1 ? `<span class="mini"><span class="bar"><i style="width:${pctOf(d, n)}%"></i></span>${d}/${n}</span>` : ''}
      <input type="checkbox" class="gc" data-sach="${a.id}" ${dn ? 'checked' : ''} title="Succès obtenu" aria-label="Succès obtenu"></div>
  </div>`;
}
function questRow(qid, groupAid = null){
  const q = SC.quetes[qid] || {}, dn = qDoneS(qid), stt = qStatus(qid);
  const owners = (QOWN[qid] || []).map(id => SACH[id]).filter(a => a && a.id !== groupAid);
  const nxt = (QNEXT[qid] || []).length, why = stt === 'lock' ? lockReasons(qid) : [];
  const meta = [owners.map(a => esc(a.n)).join(' · '), nxt ? `débloque ${plural(nxt, 'quête')}` : '', why.length ? `Bloquée : ${esc(why[0])}${why.length > 1 ? ` (+${why.length - 1})` : ''}` : ''].filter(Boolean).join(' · ');
  return `<div class="row${dn ? ' done' : ''}${GOALQ[qid] ? ' goal' : ''}${isPick('q', qid) ? ' sel' : ''}" id="q${qid}" data-pick="q:${qid}" tabindex="0" role="button">
    <input type="checkbox" class="gc round ${qCls(qid)}" data-sq="${qid}" ${dn ? 'checked' : ''} title="${QSTAT_LBL[stt]} — cocher quand elle est faite" aria-label="Quête faite">
    <div style="min-width:0"><div class="t">${qIcon(q, qid)}${esc(qName(qid))}</div>${meta ? `<div class="m">${meta}</div>` : ''}${tagsHtml(q)}</div>
    <div class="r">${goalIcons(GOALQ[qid])}${dzIcons(notGoal(DZ_REW_Q[qid], GOALQ[qid]))}${q.ev ? '<span class="grp" title="Quête d’événement">événement</span>' : ''}${qFlags(q)}<span class="lv">${lvTxt(q)}</span></div>
  </div>`;
}

