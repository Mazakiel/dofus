// ===== Copier un nom pour le chercher en jeu, ouvrir la fiche DofusDB.
const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
const copyBtn = (text, what = 'le nom') => `<button type="button" class="copy" data-copy="${esc(text)}" title="Copier ${what}" aria-label="Copier ${what}">${COPY_ICON}</button>`;
// Coordonnées d'une carte : le bouton copie la commande de déplacement du jeu ([-63,-93] → « /travel -63 -93 »), à coller dans le chat
const travelCmd = p => `/travel ${p.x} ${p.y}`;
const coordBtn = p => p.x == null ? '' : `<button type="button" class="coord" data-copy="${travelCmd(p)}" title="Copier ${travelCmd(p)}" aria-label="Copier la commande ${travelCmd(p)}">[${p.x},${p.y}]</button>`;
// Fiche DofusDB (adresses du site : quêtes, objets et donjons au singulier, succès au pluriel)
const DDB = 'https://dofusdb.fr/fr/database/';
const ddbUrl = { q: id => `${DDB}quest/${id}`, a: id => `${DDB}achievements/${id}`, d: id => `${DDB}item/${id}`, j: id => `${DDB}dungeon/${id}` };
const DPLN = 'https://www.dofuspourlesnoobs.com';   // guides de donjons : une page par donjon, adresses dans data/dpln-links.json
// Page « Dofus pour les Noobs » d'une quête, d'un succès ou d'un donjon (adresse relative au site)
const dplnLink = u => u ? `<a class="ddb" href="${DPLN}${u}" target="_blank" rel="noopener noreferrer">Guide Dofus pour les Noobs ↗</a>` : '';
const ddbLink = (kind, id, label = 'Voir sur DofusDB') => `<a class="ddb" href="${ddbUrl[kind](id)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;

// Copie dans le presse-papiers ; sans l'API (page non sécurisée, ancien navigateur) on passe par une zone de texte cachée
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* repli ci-dessous */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove(); return ok;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();   // un bouton « copier » dans une ligne ne doit pas aussi l'ouvrir
  const ok = await copyText(b.dataset.copy);
  b.classList.add(ok ? 'copied' : 'copyfail'); b.title = ok ? 'Copié' : 'Copie impossible : sélectionne le texte à la main';
  setTimeout(() => { b.classList.remove('copied', 'copyfail'); }, 1400);
}, true);
