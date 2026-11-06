// Contrôles de bout en bout dans un vrai navigateur : npm run test:e2e (la page est construite par le test lui-même).
// Les scénarios tournent sur un jeu de données figé (tests/fixtures/dofusdb.json) : une mise à jour des données DofusDB ne les touche pas.
// « Golden master » : la photo des règles (statuts, cascades…) sur ce jeu figé est comparée à golden.json.
// Changement voulu des règles : UPDATE_GOLDEN=1 npm run test:e2e
// Un dernier scénario construit la page avec les données ACTUELLES (data/dofusdb.json) et vérifie qu'elle se charge.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, findChrome } = require('./browser.js');

const { execFileSync } = require('node:child_process');
const os = require('node:os');
const ROOT = path.join(__dirname, '..', '..');
const buildPage = dataFile => { const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dofus-page-')), 'index.html'); execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.js'), dataFile, out], { stdio: 'ignore' }); return out; };
const GOLDEN = path.join(__dirname, 'golden.json');
const skip = !findChrome() ? 'Chrome introuvable (CHROME_BIN)' : false;
const PAGE = skip ? null : buildPage(path.join(__dirname, '..', 'fixtures', 'dofusdb.json'));   // page de test : données figées
const withPage = async (fn, opts, page = PAGE) => { const p = await open('file://' + page, opts); try { await fn(p); } finally { await p.close(); } };

// état déterministe posé dans le stockage, puis rechargement
const SEED = `(()=>{
  const q=Object.keys(SC.quetes).map(Number).sort((a,b)=>a-b), A=SC.succes.map(a=>a.id).sort((a,b)=>a-b);
  const X=Object.keys(SC.objectifs).filter(k=>SC.objectifs[k].t==='x').map(Number).sort((a,b)=>a-b), D=SC.dofus.map(d=>d.id);
  const set=(k,v)=>localStorage.setItem('c200:p:default:'+k,JSON.stringify(v));
  set('sq',q.filter((x,i)=>i%3===0)); set('sdone',A.filter((x,i)=>i%23===0)); set('sodone',X.filter((x,i)=>i%4===0)); set('sLevel',120);
  const sdz={}; D.forEach((id,i)=>{ if(i%5===1) sdz[id]='owned'; if(i%7===2) sdz[id]='missing'; }); set('sdzState',sdz); set('sdzGoals',D.filter((x,i)=>i%6===3));
  const qs={}; q.forEach((id,i)=>{ if(i%11===4) qs[id]='s'; if(i%13===5) qs[id]='b'; }); set('qState',qs);
})()`;
const PHOTO = `(()=>{
  const h=s=>{let x=5381;for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;return (x>>>0).toString(16)};
  const qids=Object.keys(SC.quetes).map(Number).sort((a,b)=>a-b), aids=SC.succes.map(a=>a.id).sort((a,b)=>a-b);
  const ser=acc=>['a','q','o','d'].map(k=>[...acc[k]].sort((a,b)=>a-b).join(',')).join('|');
  const o={};
  o.statuts=h(qids.map(id=>id+':'+qStatus(id)).join(';'));
  o.dispo=h(qids.map(id=>id+':'+(qAvailNow(id)?1:0)+(qDoneS(id)?1:0)).join(';'));
  o.raisons=h(qids.map(id=>id+':'+lockReasons(id).join('/')).join(';'));
  o.succesFaits=h(aids.map(id=>id+':'+(achDone(id)?1:0)).join(';'));
  o.succesDispo=h(aids.map(id=>id+':'+(achAvailNow(id)?1:0)).join(';'));
  o.dofus=h(SC.dofus.map(d=>d.id+':'+(sdzOwned(d)?1:0)+(P.dofusAuto(d)?1:0)).join(';'));
  o.prereqQ=h(qids.filter((x,i)=>i%7===0).map(id=>id+':'+ser(collectPrereqs('q',id))).join(';'));
  o.prereqA=h(aids.filter((x,i)=>i%9===0).map(id=>id+':'+ser(collectPrereqs('a',id))).join(';'));
  o.prereqD=h(SC.dofus.map(d=>d.id+':'+ser(collectPrereqs('d',d.id))).join(';'));
  o.depQ=h(qids.filter((x,i)=>i%7===0).map(id=>id+':'+ser(collectDependents('q',id))).join(';'));
  o.depA=h(aids.filter((x,i)=>i%9===0).map(id=>id+':'+ser(collectDependents('a',id))).join(';'));
  o.depD=h(SC.dofus.map(d=>d.id+':'+ser(collectDependents('d',d.id))).join(';'));
  computeGoals();
  o.objectifs=h(Object.keys(GOALQ).sort().map(k=>k+':'+GOALQ[k].map(d=>d.id).join(',')).join(';')+'#'+Object.keys(GOALA).sort().map(k=>k+':'+GOALA[k].map(d=>d.id).join(',')).join(';'));
  o.visibilite=h(qids.map(id=>id+':'+(qShown(id)?1:0)).join(';')+'#'+aids.map(id=>id+':'+(aShown(SACH[id])?1:0)).join(';'));
  o.compte=[qids.filter(qDoneS).length, aids.filter(id=>achDone(id)).length, SC.dofus.filter(sdzOwned).length].join('/');
  // contenu suivi : quels succès, quêtes et Dofus sont visibles (saisonniers inclus ou non), et comment les catégories se regroupent
  const parts=[]; const keep=sSeasonal;
  for (const seas of [false,true]) { sSeasonal=seas;
    parts.push(SC.succes.filter(sVisible).map(a=>a.id).join(','), qids.filter(qVisible).join(','), SC.dofus.filter(sdzVisible).map(d=>d.id).join(','),
      ['succes','quetes'].map(m=>{ sMode=m; return scCatList().map(c=>c.id+':'+c.n).join('|'); }).join('#')); }
  sSeasonal=keep; sMode='succes';
  parts.push(SC.succes.map(a=>a.id+':'+groupOf(a.c)+':'+(catAllowed(a.c)?1:0)).join(','), scCatList().filter(c=>c.id>0).map(c=>c.id+'='+catIds(c.id).join('+')).join(';'));
  o.suivi=h(parts.join('§'));
  o.suiviNombres=[SC.succes.length, SC.succes.filter(a=>catAllowed(a.c)).length, qids.length].join('/');
  return o;
})()`;

test('golden master : les règles donnent les mêmes résultats sur les vraies données', { skip }, () => withPage(async p => {
  await p.eval(SEED); await p.reload();
  const photo = await p.eval(PHOTO);
  if (process.env.UPDATE_GOLDEN || !fs.existsSync(GOLDEN)) { fs.writeFileSync(GOLDEN, JSON.stringify(photo, null, 2) + '\n'); return; }
  assert.deepEqual(photo, JSON.parse(fs.readFileSync(GOLDEN, 'utf8')));
}));

test("états d'une quête : commencée, bloquée, filtres d'avancement, visibilité", { skip }, () => withPage(async p => {
  const r = await p.eval(`(()=>{
    document.querySelector('[data-smode=quetes]').click(); document.querySelector('[data-scat="-2"]').click();
    const av=Object.keys(SC.quetes).map(Number).filter(q=>qStatus(q)==='av'), lock=Object.keys(SC.quetes).map(Number).find(q=>qStatus(q)==='lock');
    const out={};
    sPick={k:'q',id:av[0]}; renderSucces(); document.querySelector('#scDetail [data-qst=s]').click(); out.st=qStatus(av[0]); out.cls=document.querySelector('#q'+av[0]+' input.gc').className;
    sPick={k:'q',id:av[1]}; renderSucces(); document.querySelector('#scDetail [data-qst=b]').click(); out.bl=qStatus(av[1]);
    out.chips=[...document.querySelectorAll('#scList [data-progf]')].map(b=>b.dataset.progf+':'+b.querySelector('small').innerText).join(',');
    document.querySelector('[data-progf=st]').click(); out.filtre=[...document.querySelectorAll('#scList .row')].length;
    document.querySelector('[data-progf=st]').click();
    sShowLocked=false; sPick={k:'q',id:lock}; renderSucces(); document.querySelector('#scDetail [data-qst=s]').click(); out.indispoMarquee=!!document.getElementById('q'+lock);
    document.querySelector('#scDetail [data-qst=s]').click(); out.retiree=qState[lock]===undefined;
    window.AV0=av[0];
    return out; })()`);
  await p.wait(100);   // la sauvegarde est automatique, à la fin du geste
  r.persiste = await p.eval(`JSON.parse(localStorage.getItem('c200:p:default:qState'))[AV0]`);
  assert.equal(r.st, 'st'); assert.match(r.cls, /\bst\b/); assert.equal(r.bl, 'bl');
  assert.match(r.chips, /av:\d+,st:1,bl:1/); assert.equal(r.filtre, 1);
  assert.equal(r.indispoMarquee, true); assert.equal(r.retiree, true); assert.equal(r.persiste, 's');
}));

test('« Mes objectifs » : mêmes règles que les autres listes, indisponibles seulement si la case est cochée', { skip }, () => withPage(async p => {
  const r = await p.eval(`(()=>{
    const d=SDZL.find(x=>/Pourpre/.test(x.n)); sdzGoals.replace([d.id]); sMode='quetes'; sCat=QGOAL; sShowLocked=false; renderSucces();
    const rows=()=>[...document.querySelectorAll('#scList .row')], locked=()=>rows().filter(r=>r.querySelector('input.gc.lock')).length;
    const off={n:rows().length,locked:locked(),menu:document.querySelector('[data-scat="-3"]').innerText.replace(/\\n/g,' ')};
    sShowLocked=true; renderSucces(); const on={n:rows().length,locked:locked()};
    sShowLocked=false; sCat=QALL; renderSucces(); const liste={locked:locked()};
    return {off,on,liste,chips:document.querySelectorAll('#scList .chips').length}; })()`);
  assert.equal(r.off.locked, 0); assert.ok(r.on.locked > 0); assert.ok(r.on.n > r.off.n);
  assert.match(r.off.menu, /Mes objectifs\s+\d+/); assert.equal(r.liste.locked, 0); assert.equal(r.chips, 1);
}));

test('cascade : valider un succès valide ses prérequis, décocher les retire', { skip }, () => withPage(async p => {
  const r = await p.eval(`(()=>{
    document.querySelector('[data-smode=succes]').click();
    window.A=SC.succes.find(a=>sVisible(a)&&a.ob.length>1&&collectPrereqs('a',a.id).q.size>1); window.PRE=collectPrereqs('a',A.id);
    sPick={k:'a',id:A.id}; renderSucces(); document.querySelector('#scDetail [data-adone]').click();
    const out={dialogue:!!document.querySelector('dialog#scDialog[open]'),resume:document.getElementById('scDlgSum').innerText};
    document.querySelector('[data-dlact=apply]').click();
    out.obtenu=sdone.has(A.id); out.quetes=[...PRE.q].every(q=>sq.has(q));
    sPick={k:'a',id:A.id}; renderSucces(); document.querySelector('#scDetail [data-adone]').click(); out.titre=document.getElementById('scDlgTitle').innerText;
    document.querySelector('[data-dlact=apply]').click();
    out.retire=!achDone(A.id); out.reste=[...PRE.q].filter(q=>sq.has(q)).length;
    return out; })()`);
  assert.equal(r.dialogue, true); assert.match(r.resume, /tu valides aussi \d+ quêtes/);
  assert.equal(r.obtenu, true); assert.equal(r.quetes, true);
  assert.match(r.titre, /^Décocher/); assert.equal(r.retire, true); assert.equal(r.reste, 0);
}));

test('le bouton « Faite » demande confirmation, et annuler ne change rien', { skip }, () => withPage(async p => {
  const r = await p.eval(`(()=>{
    document.querySelector('[data-smode=quetes]').click(); document.querySelector('[data-scat="-2"]').click();
    const q=Object.keys(SC.quetes).map(Number).find(x=>qStatus(x)==='av'&&!(QOWN[x]||[]).length&&!(QNEXT[x]||[]).length&&!collectPrereqs('q',x).q.size);
    sPick={k:'q',id:q}; renderSucces();
    const boutons=[...document.querySelectorAll('#scDetail .acts.prog .btn')].map(b=>b.innerText.toLowerCase());
    document.querySelector('#scDetail [data-qdone]').click(); const msg=document.getElementById('cfMsg').innerText;
    document.querySelector('[data-cf="0"]').click(); const annule=sq.has(q);
    return {q,boutons,msg,annule}; })()`);
  assert.deepEqual(r.boutons, ['commencée', 'bloquée', 'faite']); assert.match(r.msg, /comme faite \?$/); assert.equal(r.annule, false);
  await p.wait(300);
  const r2 = await p.eval(`(()=>{ const q=${r.q}; sPick={k:'q',id:q}; renderSucces(); document.querySelector('#scDetail [data-qdone]').click(); document.getElementById('cfOk').click(); return null; })()`);
  await p.wait(500);
  assert.equal(await p.eval(`sq.has(${r.q})`), true);
  await p.eval(`(()=>{ sPick={k:'q',id:${r.q}}; renderSucces(); document.querySelector('#scDetail [data-qdone]').click(); return null; })()`);
  await p.wait(400);
  assert.equal(await p.eval(`sq.has(${r.q})`), false, 'un second clic sur « Faite » décoche (sans dépendants, sans confirmation)');
}));

test('synchro : envoi, réception, fusion en cas de conflit (Firestore simulé)', { skip }, () => withPage(async p => {
  await p.eval(`window.REMOTE=null; window.fb={user:{uid:'u1',email:'moi@test.fr'},db:{},fs:{doc:(d,c,id)=>({id}),
    getDoc:async()=>({exists:()=>!!REMOTE,data:()=>JSON.parse(JSON.stringify(REMOTE))}),
    setDoc:async(r,d)=>{REMOTE=REMOTE||{profiles:{}};Object.assign(REMOTE.profiles,JSON.parse(JSON.stringify(d.profiles)))},
    serverTimestamp:()=>1,updateDoc:async()=>{},deleteField:()=>0}}; 1`);
  await p.eval(`sq.replace([1,2,3]); 1`); await p.wait(100); await p.eval(`syncNow(true)`); await p.wait(500);
  assert.deepEqual(await p.eval(`REMOTE.profiles.default.sq`), [1, 2, 3]);
  await p.eval(`(()=>{const r=REMOTE.profiles.default; r.sq=[1,2,3,999]; r.savedAt=new Date(Date.now()+5000).toISOString(); return syncNow(false)})()`); await p.wait(500);
  assert.deepEqual(await p.eval(`[...sq].sort((a,b)=>a-b)`), [1, 2, 3, 999]);
  await p.eval(`sq.add(50); 1`); await p.wait(100);
  await p.eval(`(()=>{const r=REMOTE.profiles.default; r.sq=[1,2,3,999,777]; r.savedAt=new Date(Date.now()+9000).toISOString(); setTimeout(()=>document.getElementById('cfOk').click(),400); return syncNow(true)})()`); await p.wait(1200);
  assert.deepEqual(await p.eval(`[...sq].sort((a,b)=>a-b)`), [1, 2, 3, 50, 777, 999]);
  assert.deepEqual(await p.eval(`REMOTE.profiles.default.sq.slice().sort((a,b)=>a-b)`), [1, 2, 3, 50, 777, 999]);
}));

test('la progression se sauvegarde toute seule et survit au rechargement', { skip }, () => withPage(async p => {
  const q = await p.eval(`(()=>{ const q=Object.keys(SC.quetes).map(Number).find(x=>qStatus(x)==='av'); sq.add(q); qState[q+1]='s'; P.state.level=88; return q; })()`);
  await p.wait(150);
  assert.deepEqual(await p.eval(`JSON.parse(localStorage.getItem('c200:p:default:sq'))`), [q]);
  assert.equal(await p.eval(`JSON.parse(localStorage.getItem('c200:p:default:sLevel'))`), 88);
  assert.ok(await p.eval(`!!localStorage.getItem('c200:p:default:savedAt')`), 'date de dernière modification posée');
  await p.reload();
  assert.equal(await p.eval(`sq.has(${q}) && qState[${q + 1}]==='s' && P.state.level===88`), true);
}));

test('profils : un nouveau profil est vide, chaque profil retrouve sa progression, supprimer efface ses clés', { skip }, () => withPage(async p => {
  const q = await p.eval(`(()=>{ const q=Object.keys(SC.quetes).map(Number).find(x=>qStatus(x)==='av'); sq.add(q); return q; })()`);
  await p.wait(150);
  const id = await p.eval(`(()=>{ const id=PS.add('Alt'); PS.switchTo(id); return id; })()`);
  await p.reload();
  assert.deepEqual(await p.eval(`[PS.current(), PS.name(PS.current()), sq.size]`), [id, 'Alt', 0]);
  await p.eval(`sq.add(${q + 5}); 1`); await p.wait(150);
  await p.eval(`PS.switchTo('default'); 1`); await p.reload();
  assert.deepEqual(await p.eval(`[...sq]`), [q], 'le profil par défaut a gardé sa progression');
  assert.equal(await p.eval(`PS.remove(${JSON.stringify(id)})`), true);
  assert.equal(await p.eval(`Object.keys(localStorage).filter(k=>k.startsWith('c200:p:${id}:')).length`), 0);
}));

test('la copie IndexedDB restaure les coches si le localStorage est vidé', { skip }, () => withPage(async p => {
  const q = await p.eval(`(()=>{ const q=Object.keys(SC.quetes).map(Number).find(x=>qStatus(x)==='av'); sq.add(q); return q; })()`);
  await p.wait(400);                       // le temps que la copie miroir soit écrite
  await p.eval(`localStorage.clear(); 1`);
  await p.reload(); await p.wait(2500);    // le rechargement détecte la perte et restaure
  assert.equal(await p.eval(`sq.has(${q})`), true);
}));

test('la page construite avec les données actuelles se charge et affiche du contenu', { skip }, () => withPage(async p => {
  const r = await p.eval(`({ quetes: Object.keys(SC.quetes).length, succes: SC.succes.length, dofus: SC.dofus.length, menu: SC.menu.length,
    arbre: document.querySelectorAll('#scTree .sc-cat').length, lignes: document.querySelectorAll('#scList .row').length, titre: document.title })`);
  assert.ok(r.quetes > 500 && r.succes > 100 && r.dofus > 10 && r.menu > 5, JSON.stringify(r));
  assert.ok(r.arbre > 5 && r.lignes > 0, 'le menu et une liste s’affichent : ' + JSON.stringify(r));
  assert.equal(r.titre, 'Progression Dofus');
}, {}, buildPage(path.join(__dirname, '..', '..', 'data', 'dofusdb.json'))));
