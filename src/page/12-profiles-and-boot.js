// ===== Export / import des coches, profils, et démarrage de la page.
// ---- Export / import des coches ----
document.getElementById('exportBtn').onclick = () => {
  const payload = ProgressStore.exportFile(P.snapshot(), PS.name(PS.current()));
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `coches-${PS.name(PS.current()).replace(/[^\w\u00C0-\u017F-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text()), info = ProgressStore.inspectImport(j);
    if (!info.count && !info.hasDofus) { uiAlert('Aucune coche reconnue dans ce fichier.'); return; }
    if (!(await askConfirm(`Le fichier contient ${info.count} coche(s) de succès, quêtes et objectifs${info.profil ? ` (profil « ${info.profil} »)` : ''}. Les ajouter au profil « ${PS.name(PS.current())} » ?`, 'Importer'))) return;
    const avant = P.snapshot();
    P.load(ProgressStore.importInto(P.snapshot(), j, { dofus: id => !!SDZ[id], quest: id => !!SC.quetes[id] }));
    persistNow(); showUndo('Import terminé', avant); saveSc();
  } catch (err) { uiAlert('Fichier illisible : ' + err.message); }
};

// ---- Profils : bouton dans l'en-tête + fenêtre de gestion ----
const profName = id => PS.name(id);
const pfDlg = document.getElementById('pfDialog');
let pfEdit = null;   // profil en cours de renommage
function renderProfiles(){
  document.getElementById('profBtn').textContent = `${profName(PS.current())} ▾`;
  document.getElementById('mProfName').textContent = profName(PS.current());
  const one = PS.profiles().length < 2;
  document.getElementById('pfList').innerHTML = PS.profiles().map(p => {
    const sm = PS.summary(p.id), nq = sm.quests, na = sm.achievements, lv = sm.level;
    const cur = p.id === PS.current();
    const name = pfEdit === p.id
      ? `<input type="text" data-pfname="${esc(p.id)}" value="${esc(p.n)}" maxlength="40" aria-label="Nom du profil">`
      : `<div class="pf-n">${esc(p.n)}${cur ? ' <span class="badge avail">actif</span>' : ''}</div>`;
    return `<div class="pf-row${cur ? ' cur' : ''}">
      <div class="pf-main">${name}<div class="pf-meta">niv. ${lv} · ${nq} quête${nq > 1 ? 's' : ''} · ${na} succès cochés</div></div>
      ${pfEdit === p.id
        ? `<button class="btn primary" data-pfsave="${esc(p.id)}">OK</button><button class="btn" data-pfcancel>Annuler</button>`
        : `${cur ? '' : `<button class="btn primary" data-pfopen="${esc(p.id)}">Ouvrir</button>`}<button class="btn" data-pfren="${esc(p.id)}" title="Renommer">Renommer</button><button class="btn" data-pfdel="${esc(p.id)}" ${one ? 'disabled title="Il faut garder au moins un profil"' : 'title="Supprimer ce profil et ses coches"'}>Supprimer</button>`}
    </div>`;
  }).join('');
  const inp = pfDlg.querySelector('[data-pfname]'); if (inp) { inp.focus(); inp.select(); }
}
const renderSub = () => { document.getElementById('sub').textContent = `DofusDB du ${new Date(SC.genereLe || Date.now()).toLocaleDateString('fr-FR')}`; };
const switchProfile = id => { PS.switchTo(id); location.reload(); };
const saveName = id => {
  const inp = pfDlg.querySelector(`[data-pfname="${CSS.escape(id)}"]`); const n = inp ? inp.value.trim() : '';
  if (n) PS.rename(id, n);
  pfEdit = null; renderProfiles();
};
document.getElementById('profBtn').onclick = () => { pfEdit = null; renderProfiles(); pfDlg.showModal(); };
document.getElementById('pfClose').onclick = () => pfDlg.close();
pfDlg.addEventListener('click', async e => {
  if (e.target === pfDlg) { pfDlg.close(); return; }   // clic sur le fond
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pfopen) switchProfile(b.dataset.pfopen);
  else if (b.dataset.pfren) { pfEdit = b.dataset.pfren; renderProfiles(); }
  else if (b.dataset.pfsave) saveName(b.dataset.pfsave);
  else if ('pfcancel' in b.dataset) { pfEdit = null; renderProfiles(); }
  else if (b.dataset.pfdel) {
    const id = b.dataset.pfdel; if (PS.profiles().length < 2) return;
    if (!(await askConfirm(`Supprimer le profil « ${profName(id)} » et toutes ses coches ? Exporte-le avant si tu veux garder une copie.`, 'Supprimer'))) return;
    const wasCurrent = id === PS.current();
    PS.remove(id); syncDelete(id);
    if (wasCurrent) location.reload(); else renderProfiles();
  }
});
pfDlg.addEventListener('keydown', e => {
  const inp = e.target.closest('[data-pfname]'); if (!inp) return;
  if (e.key === 'Enter') { e.preventDefault(); saveName(inp.dataset.pfname); }
  else if (e.key === 'Escape') { e.preventDefault(); pfEdit = null; renderProfiles(); }
});
document.getElementById('pfNewForm').onsubmit = e => {
  e.preventDefault();
  const n = document.getElementById('pfNewName').value.trim(); if (!n) { document.getElementById('pfNewName').focus(); return; }
  switchProfile(PS.add(n));
};
renderProfiles();
renderSub();
renderSucces();
