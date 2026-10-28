import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOnboarding, observeOnboarding, forgeGuidance } from './forgeOnboarding.ts';
import { migrateSave, defaultSaveData } from './save.ts';
import { createSim, stepSim } from './sim.ts';
import { DEFAULT_DESIGN, STEELS } from './catalog.ts';

test('old/malformed saves get minimal unlearned guidance; valid progress survives migration',()=>{
 const empty=normalizeOnboarding(undefined);
 assert.deepEqual(empty,{heat:false,hammer:false,completed:false,dismissed:false});
 assert.equal(normalizeOnboarding({dismissed:'true'}).dismissed,false);
 assert.deepEqual(migrateSave({...defaultSaveData,forgeOnboarding:{...empty,dismissed:true}}).forgeOnboarding,{...empty,dismissed:true});
 assert.deepEqual(migrateSave({...defaultSaveData}).forgeOnboarding,empty);
});
test('only physical milestones teach; no frame/timer progression or completion on failure',()=>{
 const p=normalizeOnboarding(undefined); const s=createSim(DEFAULT_DESIGN);
 assert.strictEqual(observeOnboarding(p,s),p);
 s.phase='forge'; let next=observeOnboarding(p,s); assert.equal(next.heat,true); assert.equal(next.hammer,false);
 s.strikes=1; next=observeOnboarding(next,s); assert.equal(next.hammer,true); assert.equal(next.completed,false);
 s.phase='quench'; s.strikes=8; assert.equal(observeOnboarding(next,s).completed,false);
 s.done=true; s.broken=true; assert.equal(observeOnboarding(next,s).completed,false);
 s.broken=false; assert.equal(observeOnboarding(next,s).completed,true);
 assert.strictEqual(observeOnboarding({...next,dismissed:true},s).dismissed,true);
});
test('guidance follows actual recovered phase, thermal catalog and existing consequences',()=>{
 const p=normalizeOnboarding(undefined); const s=createSim(DEFAULT_DESIGN); const steel=STEELS[DEFAULT_DESIGN.steel];
 const h={...s,message:'Bom golpe.'};
 h.heat=steel.heatMin-.01; assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),/Aqueça/);
 h.heat=steel.heatMin; assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),/Metal pronto/);
 h.heat=steel.heatMax+.01; assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),/acima/);
 h.phase='forge'; h.heat=.8; assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),/Segure/);
 h.strikes=1; assert.equal(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),'Bom golpe.');
 h.heat=steel.heatMin-.05; assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),/Metal frio/);
 assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',true),/Reaquecendo/);
 h.phase='quench'; h.charging=false; assert.match(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),/mergulhar/);
 h.charging=true; h.message='Faixa perfeita de têmpera — solte agora!'; assert.equal(forgeGuidance(h,DEFAULT_DESIGN.steel,p,'touch',false),h.message);
 assert.equal(forgeGuidance({...h,charging:false},DEFAULT_DESIGN.steel,{...p,dismissed:true},'touch',false),h.message);
});
test('onboarding observation does not mutate simulation or its outcomes',()=>{
 const a=createSim(DEFAULT_DESIGN), b=structuredClone(a); let p=normalizeOnboarding(undefined);
 for(let i=0;i<250;i++){ const input={charging:false,action:i===35,reheat:false}; stepSim(a,.02,{...input},DEFAULT_DESIGN,i*.02); stepSim(b,.02,{...input},DEFAULT_DESIGN,i*.02); p=observeOnboarding(p,a); }
 assert.deepEqual(a,b);
});

import { loadSave } from './save.ts';
import { executeStartForgeTransaction, executeForgeCheckpointTransaction, executeFinishSwordTransaction } from './transactions.ts';
import { createForgeSnapshot } from './sim.ts';
import { playForgeAttempt } from './forge-test-helpers.ts';
test('training completion persists onboarding in the existing checkpoint and keeps real rewards isolated',()=>{
 const storage:Record<string,string>={};const local={getItem:(k:string)=>storage[k]??null,setItem:(k:string,v:string)=>{storage[k]=v;},removeItem:(k:string)=>{delete storage[k];}};
 (globalThis as any).window={localStorage:local};
 const initial=structuredClone(defaultSaveData);
 const started=executeStartForgeTransaction(initial,DEFAULT_DESIGN,{isTraining:true});assert.equal(started.success,true);
 const actual=started.save.activeForgeAttempt!.design;
 const played=playForgeAttempt(started.save,{stopAfterStrikes:8});
 while(played.sim.quenchFill<.52) stepSim(played.sim,.025,{charging:true,action:false,reheat:false},actual,played.sim.elapsedTime+.025);
 stepSim(played.sim,.025,{charging:false,action:false,reheat:false},actual,played.sim.elapsedTime+.025);
 const progress=observeOnboarding(normalizeOnboarding(undefined),played.sim);
 const snapshot=createForgeSnapshot(played.sim,actual,played.save.activeForgeAttempt!.snapshot!.revision+1);
 const checkpoint=executeForgeCheckpointTransaction({...played.save,forgeOnboarding:progress},snapshot);
 assert.equal(checkpoint.success,true,JSON.stringify({code:checkpoint.code,error:checkpoint.error}));assert.deepEqual(loadSave().forgeOnboarding,progress);assert.equal(progress.completed,true);
 const finished=executeFinishSwordTransaction(checkpoint.save,played.sim,actual);assert.equal(finished.success,true);
 assert.equal(finished.save.gallery.length,0);assert.equal(finished.save.trainingGallery?.length,1);assert.equal(finished.save.wallet.gold,initial.wallet.gold);
 assert.equal(loadSave().forgeOnboarding?.completed,true);
});
