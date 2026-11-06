// ===== Annuler la dernière action en masse : un bandeau « Annuler » reste affiché quelques secondes.
// Une action annulable = une fonction qui modifie la progression ; on garde la photo d'avant (P.snapshot) et on la recharge.
var undoTimer = null, undoSnap = null;
function hideToast() { clearTimeout(undoTimer); undoSnap = null; document.getElementById('toast').hidden = true; }
function showUndo(label, before) {
  undoSnap = before;
  const t = document.getElementById('toast');
  t.innerHTML = `<span></span><button class="btn" type="button" data-undo>Annuler</button>`;
  t.firstChild.textContent = label; t.hidden = false;
  clearTimeout(undoTimer); undoTimer = setTimeout(hideToast, 10000);
}
// Photo avant, action, puis bandeau (rien si l'action n'a rien changé)
function withUndo(label, action) {
  const before = P.snapshot(); action();
  if (JSON.stringify(before) !== JSON.stringify(P.snapshot())) showUndo(label, before);
}
document.getElementById('toast').addEventListener('click', e => {
  if (!e.target.closest('[data-undo]') || !undoSnap) return;
  P.load(undoSnap); hideToast(); persistNow(); saveSc();
});
