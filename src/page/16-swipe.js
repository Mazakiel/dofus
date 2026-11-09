// (SWIPE_* en `var` : renderSucces, appelée plus tôt au chargement, les lit déjà)
// ===== Glisser une ligne (écran tactile) : valider une quête ou un succès d'un geste, façon boîte mail.
// Ce qu'un glissement fait dépend de sa direction ; le choix est dans Réglages et suit l'utilisateur d'un appareil à l'autre (ProgressStore › réglages synchronisés).
var SWIPE_ACTS = { done: 'Faite', st: 'Commencée', bl: 'Bloquée', none: 'Aucune' };
var SWIPE_DEFAULT = { swipeR: 'done', swipeL: 'st' };
function swipeAct(key) { const a = store.get(key, SWIPE_DEFAULT[key]); return SWIPE_ACTS[a] ? a : SWIPE_DEFAULT[key]; }
const SWIPE_MIN = 90;   // distance (px) à partir de laquelle on relâche pour valider

// Réglages : une liste par direction ; un changement part aussi vers le cloud
function renderSwipeSettings() {
  if (!SWIPE_ACTS) return;   // pas encore chargé (premier rendu de la page)
  document.querySelectorAll('select[data-swipe]').forEach(sel => {
    sel.innerHTML = Object.entries(SWIPE_ACTS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
    sel.value = swipeAct(sel.dataset.swipe);
  });
}
document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('select[data-swipe]'); if (s) { PS.setSyncedPref(s.dataset.swipe, s.value); syncSoon(); } });

// Ce que ferait un glissement sur cette ligne : { act, label, cls } ou null (rien à faire : le geste n'est pas pris)
function swipeInfo(row, dir) {
  const act = swipeAct(dir > 0 ? 'swipeR' : 'swipeL'); if (act === 'none') return null;
  const q = row.querySelector('input[data-sq]'), a = row.querySelector('input[data-sach]');
  if (a) return act === 'done' ? { act, kind: 'a', id: +a.dataset.sach, label: achDone(+a.dataset.sach) ? 'Non obtenu' : 'Obtenu', cls: 'sw-done' } : null;
  if (!q) return null;
  const id = +q.dataset.sq, dn = qDoneS(id);
  if (act === 'done') return { act, kind: 'q', id, label: dn ? 'Non faite' : 'Faite', cls: 'sw-done' };
  if (dn) return null;   // une quête faite n'est ni commencée ni bloquée
  const on = qState[id] === (act === 'st' ? 's' : 'b');
  return { act, kind: 'q', id, label: on ? 'Retirer' : SWIPE_ACTS[act], cls: act === 'st' ? 'sw-st' : 'sw-bl' };
}
// Applique le glissement : sans conséquence sur d'autres éléments → direct, avec « Annuler » ; sinon, l'aperçu de cascade habituel
function swipeApply(info) {
  const { act, kind, id } = info, k = kind === 'a' ? 'a' : 'q', set = kind === 'a' ? sdone : sq, done = kind === 'a' ? achDone(id) : qDoneS(id);
  if (act === 'done') {
    if (done) { uncheck(k, id); return; }
    const acc = collectPrereqs(k, id);
    if (acc.a.size + acc.q.size + acc.o.size + acc.d.size) { openDlg(k, id); return; }
    withUndo(kind === 'a' ? 'Succès obtenu' : 'Quête faite', () => set.add(id)); saveSc(); return;
  }
  const v = act === 'st' ? 's' : 'b';
  withUndo(qState[id] === v ? 'Statut retiré' : act === 'st' ? 'Quête commencée' : 'Quête bloquée', () => { if (qState[id] === v) delete qState[id]; else qState[id] = v; });
  renderSucces(); offerPrereqs(id, v);
}
(() => {
  const list = document.getElementById('scList');
  let g = null, swallow = 0;   // g : geste en cours { row, x, y, dx, locked }
  const reset = row => { row.classList.remove('swiping', 'sw-done', 'sw-st', 'sw-bl', 'sw-go'); row.style.transform = ''; row.style.removeProperty('--swx'); row.removeAttribute('data-swl'); };
  list.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const row = e.target.closest('.row'); if (!row || !row.querySelector('input[data-sq],input[data-sach]')) return;
    g = { row, x: e.clientX, y: e.clientY, dx: 0, locked: false, id: e.pointerId };
  });
  list.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.locked) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }   // c'est un défilement
      if (Math.abs(dx) < 12) return;
      g.locked = true; g.row.classList.add('swiping');
    }
    const info = swipeInfo(g.row, dx);
    g.dx = info ? dx : 0;   // pas d'action de ce côté : la ligne ne bouge pas
    const row = g.row;
    row.classList.remove('sw-done', 'sw-st', 'sw-bl');
    if (info) { row.classList.add(info.cls); row.setAttribute('data-swl', info.label); }
    row.style.setProperty('--swx', Math.abs(g.dx) + 'px'); row.style.transform = `translateX(${g.dx}px)`;
    row.classList.toggle('sw-go', Math.abs(g.dx) >= SWIPE_MIN); row.classList.toggle('sw-l', g.dx < 0);
  });
  const end = e => {
    if (!g || (e.pointerId !== undefined && e.pointerId !== g.id)) return;
    const { row, dx, locked } = g; g = null;
    if (!locked) return;
    swallow = Date.now();   // le « clic » qui suit le geste n'ouvre pas la fiche
    const info = e.type === 'pointerup' && Math.abs(dx) >= SWIPE_MIN ? swipeInfo(row, dx) : null;
    reset(row);
    if (info) swipeApply(info);
  };
  list.addEventListener('pointerup', end); list.addEventListener('pointercancel', end);
  list.addEventListener('click', e => { if (Date.now() - swallow < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
})();
renderSwipeSettings();
