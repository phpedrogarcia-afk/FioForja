// Consolidates staged observations; never reruns device actions.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const evidence=join(here,"evidence","android-emulator");
const read=(name)=>JSON.parse(readFileSync(join(evidence,name),"utf8").replace(/^\uFEFF/,""));
const hash=(name)=>createHash("sha256").update(readFileSync(join(evidence,name))).digest("hex");
const reports=["android-run-first-driver-fling-scar.json","android-run-coordination-interrupted.json","android-run-report.json"];
const observed=reports.map((name)=>({name,report:read(name)}));
const names=[...new Set(observed.flatMap(({report})=>report.steps.map((step)=>step.name)))];
const cases=names.map((name)=>{
  const source=observed.findLast(({report})=>report.steps.some((step)=>step.name===name&&step.status==="PASS"));
  assert(source,`No completed PASS evidence for ${name}`);
  return {name,result:"PASS",source:source.name};
});
assert.equal(cases.length,9);
const last=observed.at(-1).report;
const prior=observed[1].report;
const fusion=prior.steps.find((step)=>step.name.startsWith("craft-four")).observations;
const mounting=prior.steps.find((step)=>step.name.startsWith("collection-install")).observations;
const forge=last.steps.find((step)=>step.name.startsWith("core-forge")).observations;
const persistence=last.steps.find((step)=>step.name.startsWith("new-weapon")).observations;
const old=read("android-prepare-upgrade-report.json");
const summary={
  mission:"CODEX08-ANDROID-EMULATOR",functionalVerdict:"PASS",journey:"Staged; preserved PASS steps were not rerun after driver repairs or coordinator interruption.",
  serial:"emulator-5556",avd:"FioForja_API36_APK",environment:last.environment,nativeTouchMapping:last.launch.mapping,
  oldApk:{version:"0.2.1",code:3,sha256:old.installedOld.sha256},
  candidate:{version:"0.2.2",code:4,bytes:12129669,installedBaseApkSha256:last.installedApk.sha256},
  fixture:last.fixture,interaction:last.interaction,
  backup:{storageFile:"evidence/android-emulator/android-original-storage-backup.json",storageSha256:hash("android-original-storage-backup.json"),
    nativeTar:"evidence/android-emulator/android-original-app-webview.tar",nativeTarSha256:hash("android-original-app-webview.tar"),
    beforeUpgradeSaveSha256:hash("android-before-upgrade-save.json")},
  cases,
  observedEffects:{guardDefense:[mounting.before.defense,mounting.installed.defense,mounting.replaced.defense],
    returnedGuard:mounting.returnedComponents.map((component)=>component.componentKey),
    fusion:{coreId:fusion.core.id,rarity:fusion.core.rarity,donors:fusion.core.consumedSwordIds,catalystConsumed:1},
    forge:{runId:forge.runId,metal:forge.metal,nativeStrikes:forge.result.history.length,quenchScore:forge.result.quenchScore,
      result:{id:forge.result.id,quality:forge.result.quality,rarity:forge.result.rarity,damage:forge.result.damage,defense:forge.result.defense,agility:forge.result.agility,durability:forge.result.durability},
      coreConsumedAtCompletion:true,rewardsClaimed:false},
    persistence:{exactRelevantStatePreserved:persistence.exactRelevantStatePreserved,finalWallet:persistence.wallet}},
  scars:[
    {name:"Absent package detection",classification:"DRIVER",detail:"pm path exit1 was handled as an exception before install; changed inventory query only."},
    {name:"Fixture disk flush",classification:"DRIVER",detail:"An immediate force-stop after CDP fixture write lost that synthetic write. Background flush and read/reopen proved the fixture before upgrade. Does not measure UI transaction durability."},
    {name:"UIAutomator idle timeout",classification:"DRIVER",detail:"Reused native bounds already observed in this same AVD/configuration and checked against current CSS viewport/DPR."},
    {name:"Horizontal fling tap",classification:"DRIVER",detail:"Early tap stopped horizontal scrolling instead of selecting a tab. Waited for scrolling to settle; froze successful steel purchase."},
    {name:"Uppercase visible text",classification:"DRIVER",detail:"Native visible heading uses CSS uppercase; observation assertion changed to case-insensitive."},
    {name:"Coordinator interruption",classification:"COORDINATION",detail:"Phone package disappearance triggered a halt. Owner confirmed voluntary uninstall; coordinator authorized emulator continuation. No app/driver fault was established."},
  ],
  visualEvidence:{persistedInspection:"evidence/android-emulator/08-persisted-inspection.png",persistedWeaponVisible:true,
    immediateReveal:"evidence/android-emulator/07-weapon-reveal.png",revealWeaponVisibility:"NOT_PROVEN: immediate screenshot shows blank canvas; capture timing versus rendering behavior was not isolated."},
  limits:["Synthetic fixture is not natural progression.","One emulator journey does not prove reliability or performance.","No Poco action or physical sound verification by this agent.","Native input for UI; CDP writes were confined to declared pre-journey fixture.","Runtime exception observations were interval based; interruption terminated one observer before final flush.","Rewards were generated and persisted but were not claimed in this scoped journey."],
  evidence:reports.map((name)=>({file:`evidence/android-emulator/${name}`,sha256:hash(name)})),
  generatedAt:new Date().toISOString(),
};
writeFileSync(join(here,"android-summary.json"),JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify({functionalVerdict:summary.functionalVerdict,cases:cases.length,observedEffects:summary.observedEffects,summary:join(here,"android-summary.json")},null,2));
