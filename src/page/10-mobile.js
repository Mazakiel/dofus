// ===== Mobile : onglets du bas, feuille de détail, menu de catégorie.
// ---- Mobile : onglets en bas, fiche en feuille ----
let mTab = store.get('mTab', sMode);
if (mTab !== 'plus') mTab = sMode;   // (l'ancien onglet « dofus » est devenu le mode « recomp »)
function showTab(){
  document.body.dataset.tab = mTab;
  document.querySelectorAll('#tabbar [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === mTab)));
}
function openSheet(){ document.body.classList.add('sheet-open'); document.getElementById('scDetail').scrollTop = 0; document.querySelector('.det').scrollTop = 0; routeSync(); }
function closeSheet(){ document.body.classList.remove('sheet-open'); }
document.getElementById('tabbar').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  closeSheet(); mTab = b.dataset.tab; store.set('mTab', mTab);
  if (mTab !== 'plus' && sMode !== mTab) { sPick = null; sMode = mTab; store.set('sMode', sMode); }
  renderSucces(); window.scrollTo({ top: 0 });
});
document.getElementById('scrim').addEventListener('click', dismissSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (document.body.classList.contains('sheet-open') || (!isMobile() && document.body.classList.contains('has-pick'))) && !document.querySelector('dialog[open]')) dismissSheet(); });
window.matchMedia('(max-width:700px)').addEventListener('change', e => { if (!e.matches) closeSheet(); });
document.getElementById('catBtn').addEventListener('click', () => {
  const side = document.querySelector('.side'), on = side.classList.toggle('open');
  document.getElementById('catBtn').setAttribute('aria-expanded', String(on));
});
document.getElementById('mProf').onclick = () => document.getElementById('profBtn').click();

