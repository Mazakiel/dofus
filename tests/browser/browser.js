// Pilote minimal d'un Chrome headless via le protocole DevTools (aucune dépendance).
// Cherche Chrome dans CHROME_BIN, le cache Playwright, ou le PATH. Node 22+ (WebSocket global).
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) {
    for (const d of fs.readdirSync(pw).sort().reverse()) {
      const shell = path.join(pw, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
      if (d.startsWith('chromium_headless_shell') && fs.existsSync(shell)) return shell;
    }
  }
  for (const b of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [b], { encoding: 'utf8' }).trim(); } catch (e) { /* suivant */ }
  }
  return null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Lance un navigateur avec un profil neuf et ouvre `url`. Retourne { eval, reload, close }.
async function open(url, { width = 1440, height = 900, mobile = false } = {}) {
  const bin = findChrome(); if (!bin) throw new Error('Chrome introuvable (CHROME_BIN)');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dofus-e2e-'));
  const args = ['--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'];
  if (!/headless-shell/.test(bin)) args.unshift('--headless=new');
  const chrome = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const port = await new Promise((res, rej) => {
    let buf = ''; const t = setTimeout(() => rej(new Error('Chrome ne répond pas')), 15000);
    chrome.stderr.on('data', d => { buf += d; const m = buf.match(/ws:\/\/127\.0\.0\.1:(\d+)\//); if (m) { clearTimeout(t); res(m[1]); } });
    chrome.on('exit', () => rej(new Error('Chrome arrêté')));
  });
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pending = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; } };
  const send = (method, params = {}) => new Promise(r => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const loaded = async () => { await send('Page.navigate', { url }); await sleep(1800); };
  await loaded();
  return {
    // évalue une expression dans la page ; relance l'erreur de la page si elle échoue
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result.exceptionDetails) { const e = r.result.exceptionDetails; throw new Error('Erreur dans la page : ' + ((e.exception && e.exception.description) || e.text)); }
      return r.result.result.value;
    },
    async reload() { await send('Page.reload'); await sleep(1800); },
    async wait(ms) { await sleep(ms); },
    async close() {
      try { ws.close(); } catch (e) { /* déjà fermé */ }
      const sorti = new Promise(r => chrome.once('exit', r));
      chrome.kill(); await Promise.race([sorti, sleep(5000)]);   // le profil ne se supprime qu'une fois Chrome arrêté
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    },
  };
}
module.exports = { open, findChrome };
