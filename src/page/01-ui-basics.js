// ===== Éléments de base : boîtes de confirmation dans la page, échappement HTML, thème clair / sombre.
// Confirmation / message dans la page (les boîtes natives confirm() et alert() sont bloquées dans le panneau de l'application)
function askConfirm(msg, ok = "Confirmer", cancel = "Annuler", input = null){
  return new Promise(res => {
    const inW = document.getElementById("cfInWrap"), inp = document.getElementById("cfIn");
    inW.hidden = input == null; if (input != null) inp.value = input;
    const d = document.getElementById("cfDialog"), okB = document.getElementById("cfOk"), cB = d.querySelector('[data-cf="0"]');
    document.getElementById("cfMsg").textContent = msg; okB.textContent = ok; cB.textContent = cancel || ""; cB.hidden = !cancel;
    const fin = v => { d.onclick = null; d.oncancel = null; inp.onkeydown = null; if (d.open) d.close(); res(input != null ? (v ? inp.value.trim() : null) : v); };
    inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); fin(true); } };
    d.onclick = e => { const b = e.target.closest("[data-cf]"); if (b) fin(b.dataset.cf === "1"); };
    d.oncancel = e => { e.preventDefault(); fin(false); };
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    if (input != null) { inp.focus(); inp.select(); }
  });
}
const uiAlert = msg => askConfirm(msg, "OK", null);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Thème
const THEMES = ['auto','light','dark'], THEME_LBL = {auto:'Thème : auto', light:'Thème : clair', dark:'Thème : sombre'};
let theme = store.get('theme','auto');
function applyTheme(){ if(theme==='auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme); document.getElementById('theme').textContent = THEME_LBL[theme]; document.getElementById('mTheme').textContent = THEME_LBL[theme].replace('Thème : ',''); }
const cycleTheme = () => { theme = THEMES[(THEMES.indexOf(theme)+1)%3]; store.set('theme', theme); applyTheme(); };
document.getElementById('theme').onclick = cycleTheme;
document.getElementById('mTheme').onclick = cycleTheme;
applyTheme();

// ===================== Succès et quêtes — DofusDB uniquement =====================
const SC = DOFUSDB || { categories: [], succes: [], objectifs: {}, quetes: {} };
