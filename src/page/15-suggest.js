// ===== Suggestions (quêtes seulement) : la fenêtre « Que faire maintenant ? ». Le calcul est dans le module de règles (P.suggest) ; ici l'affichage.
const SUG_PRESETS = [['mix', 'Mix'], ['goals', 'Mes objectifs'], ['level', 'Mon niveau'], ['unlock', 'Débloquer'], ['rewards', 'Récompenses']];
let sugPreset = store.get('sugPreset', 'mix');
if (!SUG_PRESETS.some(p => p[0] === sugPreset)) sugPreset = 'mix';
const sugDlg = document.getElementById('sugDialog');
const KIND_LBL = { t: 'Titre ', o: 'Ornement ', d: '' };   // un Dofus porte déjà « Dofus » dans son nom
const names = (list, max = 2) => { const n = list.map(x => x.n); return n.length > max ? `${n.slice(0, max).join(', ')} +${n.length - max}` : n.join(', '); };
function sugReason(r) {
  switch (r.t) {
    case 'goal': return `<i class="g">Objectif · ${esc(names(r.items))}</i>`;
    case 'started': return '<i>Commencée</i>';
    case 'completes': return `<i class="u">Termine « ${esc(r.ach)} »</i>`;
    case 'progress': return `<i class="u">« ${esc(r.ach)} » ${r.d} / ${r.n}</i>`;
    case 'unlock': return `<i class="u">Débloque ${plural(r.n, 'quête')}</i>`;
    case 'reward': return `<i class="r">${esc(r.items.slice(0, 2).map(x => `${KIND_LBL[x.kind]}${x.n}`).join(', '))}${r.items.length > 2 ? ` +${r.items.length - 2}` : ''}</i>`;
    case 'level': return `<i class="l">Niv. ${r.lv}</i>`;
    case 'chain': return `<i>${plural(r.n, 'prérequis fait', 'prérequis faits')}</i>`;
  }
  return '';
}
function sugWhyHtml() {
  const B = P.suggestInfo.base, f = P.suggestInfo.presets[sugPreset], x = n => Math.round(n * 10) / 10;
  const rows = [
    ['Sert un de tes objectifs', `${x(B.goal.first * f.goal)}, puis +${x(B.goal.more * f.goal)} par objectif de plus`],
    ['Déjà commencée', x(B.started * f.started)],
    ['Dernière quête d’un succès', `${x(B.completes * f.completes)} (sinon jusqu’à ${x(B.progress * f.completes)} selon l’avancement)`],
    ['Débloque d’autres quêtes', `${x(B.unlock.each * f.unlock)} par quête, ${x(B.unlock.max * f.unlock)} au plus`],
    ['Titre ou ornement à la clé', `${x(B.reward.item * f.reward)} chacun, ${x(B.reward.itemMax * f.reward)} au plus`],
    ['Dofus à la clé', x(B.reward.dofus * f.reward)],
    ['Niveau proche du tien', `jusqu’à ${x(B.level[0][1] * f.level)}`],
    ['Prérequis déjà faits', `${x(B.chain.each * f.chain)} chacun, ${x(B.chain.max * f.chain)} au plus`],
  ];
  return `<table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
}
function renderSuggest() {
  computeGoals();
  const list = P.suggest({ preset: sugPreset, goalQ: GOALQ, questVisible: qVisible, limit: 12 });
  document.getElementById('sugLvl').textContent = `Niveau ${P.state.level} · ${sq.size} quête${sq.size > 1 ? 's' : ''} faite${sq.size > 1 ? 's' : ''}`;
  document.getElementById('sugPre').innerHTML = SUG_PRESETS.map(([k, l]) => `<button type="button" class="chip${sugPreset === k ? ' on' : ''}" data-sugp="${k}" aria-pressed="${sugPreset === k}">${l}</button>`).join('');
  document.getElementById('sugWhy').innerHTML = sugWhyHtml();
  document.getElementById('sugList').innerHTML = list.length ? list.map((s, i) => {
    return `<button type="button" class="sug-row" data-sug="${s.id}"><span class="sug-rk">${i + 1}</span>
      <span class="sug-name">${esc(qName(s.id))}</span><span class="sug-go">score ${s.score}</span>
      <span class="sug-why-r">${s.reasons.map(sugReason).join('')}</span></button>`;
  }).join('') : '<div class="empty">Rien à proposer : tout ce qui est faisable est fait, bloqué ou masqué par les options d’affichage.</div>';
}
document.getElementById('sugBtn').addEventListener('click', () => { renderSuggest(); sugDlg.showModal(); });
document.getElementById('sugClose').addEventListener('click', () => sugDlg.close());
sugDlg.addEventListener('click', e => {
  if (e.target === sugDlg) { sugDlg.close(); return; }   // le fond
  const p = e.target.closest('[data-sugp]');
  if (p) { sugPreset = p.dataset.sugp; store.set('sugPreset', sugPreset); renderSuggest(); return; }
  const r = e.target.closest('[data-sug]');
  if (r) { sugDlg.close(); sPick = { k: 'q', id: +r.dataset.sug }; renderScList(); renderDetail(); if (isMobile()) openSheet(); routeSync(); }   // la fiche s'ouvre sur place, sans changer de vue
});
