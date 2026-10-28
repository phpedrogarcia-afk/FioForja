import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { defaultSaveData } from '../../src/game/save.ts';
import { DEFAULT_DESIGN } from '../../src/game/catalog.ts';
import { executeStartForgeTransaction } from '../../src/game/transactions.ts';
import { createSim,createForgeSnapshot } from '../../src/game/sim.ts';
const root=process.cwd(), dir=resolve(root,'experiments/M04A-first-forge/evidence');mkdirSync(dir,{recursive:true});
const base='C:/Users/phped/Projetos/FioForja/worktree-collection-intuitive-v1';
const servers=await Promise.all([preview({configFile:resolve(root,'vite.mobile.config.ts'),preview:{port:8971,host:'127.0.0.1'}}),preview({configFile:resolve(base,'vite.mobile.config.ts'),preview:{port:8970,host:'127.0.0.1'}})]);
const browser=await chromium.launch({channel:'msedge',headless:true}); const results=[];
const check=(name,value)=>{assert.ok(value,name);results.push({name,pass:true});};
const store={};globalThis.window={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}};
function fresh(){const s=structuredClone(defaultSaveData);delete s.forgeOnboarding;return s;}
async function context(save,width=392){const c=await browser.newContext({viewport:{width,height:width===392?819:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await c.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('a-forja-save',JSON.stringify(s));sessionStorage.setItem('seeded','yes');}},save);return c;}
async function start(p){await p.getByRole('button',{name:'Forja',exact:true}).click();await p.getByRole('button',{name:'Começar a fabricar',exact:true}).click();await p.getByRole('button',{name:'Retirar do fogo para a bigorna'}).waitFor();}
async function saved(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('a-forja-save')));}
try{
 for(const width of [360,392]){
  for(const port of [8970,8971]){
   const c=await context(fresh(),width),p=await c.newPage();await p.goto(`http://127.0.0.1:${port}`);await start(p);await p.screenshot({path:resolve(dir,`${port===8970?'before':'after'}-heat-${width}.png`)});
   const metrics=await p.evaluate(()=>({text:document.body.innerText,overflowX:document.documentElement.scrollWidth-innerWidth,overflowY:document.documentElement.scrollHeight-innerHeight,canvas:document.querySelector('canvas')?.getBoundingClientRect().toJSON()}));results.push({comparison:port===8970?'before':'after',width,...metrics});check(`no horizontal overflow ${port}/${width}`,metrics.overflowX<=0);check(`no vertical scroll ${port}/${width}`,metrics.overflowY<=0);await c.close();
  }
 }
 let quenchFixture;
 for(const width of [360,392]){
 const c=await context(fresh(),width),p=await c.newPage();await p.goto('http://127.0.0.1:8971');await start(p);
 const cdp=await c.newCDPSession(p);const down=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:196,y:440}]});const up=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.getByText('Metal pronto. Retire do fogo.',{exact:true}).waitFor();await p.getByRole('button',{name:'Retirar do fogo para a bigorna'}).click();await p.getByText('Segure na bigorna para carregar. Solte na faixa iluminada.',{exact:true}).waitFor();
 await p.screenshot({path:resolve(dir,`first-hammer-${width}.png`)});
 await p.locator('summary').click();await p.waitForTimeout(850);check('advanced controls do not strike',(await saved(p)).activeForgeAttempt.snapshot.state.strikes===0);await p.locator('summary').click();
 for(let i=0;i<8;i++){
  const heat=(await saved(p)).activeForgeAttempt.snapshot.state.heat;
  if(heat<.58){await p.getByRole('button',{name:'Reaquecer',exact:true}).click();await p.waitForTimeout(1300);}
  await down();await p.waitForFunction(()=>{const m=document.querySelector('[aria-label^="Força do golpe"]');return m&&parseFloat(m.lastElementChild.style.left)>=parseFloat(m.children[1].style.left)-1;},{},{timeout:4000});await up();await p.waitForTimeout(180);
  if(i===0){await p.waitForTimeout(800);check('first touch strike recorded',(await saved(p)).activeForgeAttempt.snapshot.state.strikes===1);check('gesture hint removed',!(await p.locator('#forge-guidance').innerText()).includes('Segure na bigorna'));await p.reload();await p.getByRole('button',{name:'Retomar ponto salvo'}).click();check('recovery stays hammer',(await p.locator('[aria-current=step]').innerText()).includes('Bigorna'));}
 }
 await p.getByText('Segure para mergulhar. Solte na faixa indicada.',{exact:true}).waitFor();quenchFixture=structuredClone(await saved(p));await p.screenshot({path:resolve(dir,`quench-${width}.png`)});await p.reload();await p.getByRole('button',{name:'Retomar ponto salvo'}).click();check('recovery stays quench',(await p.locator('[aria-current=step]').innerText()).includes('Têmpera'));
 await down();await p.waitForTimeout(1060);await up();await p.waitForTimeout(1600);const completed=await saved(p);check('real touch cycle completed',completed.forgeOnboarding.completed===true);check('one real sword',completed.gallery.length===1);await p.reload();check('completion persists',(await saved(p)).forgeOnboarding.completed===true);await c.close();
 }
 for(const phase of ['heat','forge','quench']){
  const res=executeStartForgeTransaction(fresh(),DEFAULT_DESIGN);assert.ok(res.success);const s=phase==='quench'?structuredClone(quenchFixture):res.save;delete s.forgeOnboarding;const sim=phase==='quench'?s.activeForgeAttempt.snapshot.state:createSim(DEFAULT_DESIGN,{forgeRunId:s.activeForgeAttempt.forgeRunId});sim.phase=phase;sim.heat=.7;sim.charging=true;sim.quenching=phase==='quench';s.activeForgeAttempt.snapshot=createForgeSnapshot(sim,DEFAULT_DESIGN,1);s.activeForgeAttempt.strikesCount=sim.strikes;
  const c=await context(s,360),p=await c.newPage();await p.goto('http://127.0.0.1:8971');await p.getByRole('button',{name:'Retomar ponto salvo'}).click();await p.screenshot({path:resolve(dir,`recovered-${phase}-360.png`)});check(`restored ${phase}`,await p.locator('[aria-current=step]').innerText().then(t=>t.includes(phase==='heat'?'Fogo':phase==='forge'?'Bigorna':'Têmpera')));await p.getByRole('button',{name:'Dispensar dicas'}).click();await p.reload();await p.getByRole('button',{name:'Retomar ponto salvo'}).click();check(`dismiss survives ${phase}`,await p.getByRole('button',{name:'Dispensar dicas'}).count()===0);check(`dismiss keeps physical phase ${phase}`,(await saved(p)).activeForgeAttempt.snapshot.state.phase===phase);await c.close();
 }
} finally {writeFileSync(resolve(dir,'checks.json'),JSON.stringify(results,null,2));await browser.close();for(const s of servers)await new Promise(r=>s.httpServer.close(r));}
console.log('UI CHECKS',results.filter(r=>r.pass).length);
