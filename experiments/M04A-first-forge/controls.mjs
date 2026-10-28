import { chromium } from 'playwright';import { preview } from 'vite';import { resolve } from 'node:path';import {writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {defaultSaveData} from '../../src/game/save.ts';import {DEFAULT_DESIGN} from '../../src/game/catalog.ts';import {executeStartForgeTransaction} from '../../src/game/transactions.ts';import {createSim,createForgeSnapshot} from '../../src/game/sim.ts';import {playForgeAttempt} from '../../src/game/forge-test-helpers.ts';
const mem={};globalThis.window={localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=v,removeItem:k=>delete mem[k]}};
const server=await preview({configFile:resolve('vite.mobile.config.ts'),preview:{port:8971,host:'127.0.0.1'}});const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{for(const phase of ['forge','quench']){
 let s=executeStartForgeTransaction(structuredClone(defaultSaveData),DEFAULT_DESIGN).save;
 if(phase==='quench')s=playForgeAttempt(s,{stopAfterStrikes:8}).save;
 else{const sim=createSim(s.activeForgeAttempt.design,{forgeRunId:s.activeForgeAttempt.forgeRunId});sim.phase='forge';sim.heat=.8;s.activeForgeAttempt.snapshot=createForgeSnapshot(sim,s.activeForgeAttempt.design,1);}
 const c=await browser.newContext({viewport:{width:392,height:819}});await c.addInitScript(s=>{localStorage.setItem('a-forja-save',JSON.stringify(s));},s);const p=await c.newPage();await p.goto('http://127.0.0.1:8971');await p.getByRole('button',{name:'Retomar ponto salvo'}).click();
 if(phase==='forge'){await p.getByRole('button',{name:'Dispensar dicas'}).focus();await p.keyboard.press('Enter');await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('a-forja-save')).activeForgeAttempt.snapshot.state.strikes),0);results.push('focused Enter dismisses without striking');await p.locator('canvas').click({position:{x:100,y:300}});}
 await p.keyboard.down('Space');await p.waitForTimeout(150);await p.evaluate(()=>history.back());await p.getByText('Sair da bigorna?',{exact:true}).waitFor();await p.waitForTimeout(800);
 const state=await p.evaluate(()=>JSON.parse(localStorage.getItem('a-forja-save')).activeForgeAttempt.snapshot.state);assert.equal(state.done,false);assert.equal(state.strikes,phase==='forge'?0:8);results.push(`Back does not release ${phase} without user keyup`);
 await p.keyboard.up('Space');await c.close();
}}finally{writeFileSync('experiments/M04A-first-forge/evidence/controls.json',JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));}console.log(results);
