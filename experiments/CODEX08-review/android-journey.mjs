import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultSaveData } from "../../src/game/save.ts";
import { recalculateSwordStats } from "../../src/game/catalog.ts";
import { findShopArticle } from "../../src/game/shop.ts";
import { getRequiredMaterialForSteel } from "../../src/game/materials.ts";
import { app, driver, pause, poll } from "./android-driver.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i+1] : fallback; };
const serial = arg("serial", "");
const phase = arg("phase", "observe");
const resumeAt = arg("from", ""); let reachedResumePoint = !resumeAt;
const evidence = join(here, "evidence", "android-emulator");
const d = driver(serial, evidence);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const saveArtifact = (name, value) => writeFileSync(join(evidence, name), JSON.stringify(value, null, 2) + "\n");
const relevant = (save) => ({ gallery: save.gallery, wallet: save.wallet, inventory: save.inventory, career: save.career,
  activeForgeAttempt: save.activeForgeAttempt, claimedForgeRewardIds: save.claimedForgeRewardIds, claimedStrikeRewardIds: save.claimedStrikeRewardIds });
const fixture = structuredClone(defaultSaveData);
fixture.gallery = [72,85,91,96].map((quality) => recalculateSwordStats({
  id: `codex08_emulator_${quality}`, design: { ...fixture.lastDesign, name: `Prova Android ${quality}` },
  quality, grade: quality >= 95 ? "Obra-prima" : quality >= 88 ? "Magistral" : quality >= 75 ? "Excelente" : "Boa",
  rarity: "Rara", heatScore: 85, forgeScore: 85, quenchScore: 85, warp: 0.02,
  createdAt: 1792800000000 + quality, forgeRunId: `codex08_fixture_run_${quality}`,
  baseDamage: 200 + quality, baseDefense: 100 + quality, baseAgility: 60 + quality, baseDurability: 85,
  perks: [`Traço sintético ${quality}`],
}));
fixture.wallet = { gold: 12000, rubies: 300, diamonds: 20 };
fixture.inventory.unlockedSteels = ["iron", "steel"];
fixture.inventory.materials = { iron_ingot: 0, steel_ingot: 0, damascus_billet: 0, refined_iron: 0, starmetal_ore: 0, fusion_fragment: 0, catalyst_astral: 0, scrap: 0 };
fixture.inventory.components = [];
fixture.inventory.fusionCores = [];
fixture.career = { totalForged: 4, masterpieces: 1, legendaries: 0, relics: 0, brokenBlades: 0, highestQuality: 96, totalValueEarned: 0 };
fixture.activeForgeAttempt = null;
fixture.muted = true;
const report = { mission: "CODEX08-ANDROID-EMULATOR", phase, serial, startedAt: new Date().toISOString(), status: "RUNNING",
  fixture: "EXPLICIT_SYNTHETIC: four Rara swords of free quality, wallet, steel unlock; zero materials/components/cores. Not naturally earned progression.",
  interaction: "Only native ADB tap/swipe/keyevents after fixture. CDP reads DOM/HUD/storage only; no transaction, React or canvas injection.",
  limits: "Emulator only; physical sound, Poco, performance, sustained reliability and natural progression are NOT_PROVEN.", steps: [] };
const persist = () => saveArtifact(`android-${phase}-report.json`, report);
async function step(name, action) {
  if(!reachedResumePoint && name!==resumeAt) { report.steps.push({name,status:"FROZEN_PREVIOUS_PASS",previousReport:arg("previous-report","")}); persist(); return; }
  reachedResumePoint=true;
  const record = { name, status: "RUNNING" }; report.steps.push(record); persist(); console.log(`[android-journey] ${name}`);
  try { record.observations = await action(); record.status = "PASS"; return record.observations; }
  catch(error) { record.status = "FAIL"; record.error = error.message; throw error; }
  finally { persist(); }
}
const button = (name, exact = false, scope) => d.tap({ name, exact, scope });
const tab = (name) => d.tap({ selector: '[role="tab"]', name });
const text = (name) => poll(() => d.body(), (body) => body.toLocaleLowerCase().includes(name.toLocaleLowerCase()), name);
const close = () => button("Fechar", true, '[role="dialog"]');
async function buy(category, name, id) {
  await tab(category); const before = await d.readSave();
  await button(name, false, 'main'); await button("Comprar por", false, '[role="dialog"]');
  const article = findShopArticle(id);
  const after = await poll(d.readSave, (save) => save.wallet.gold === before.wallet.gold - article.costGold, "purchase debit");
  assert.equal(after.wallet.rubies, before.wallet.rubies - (article.costRubies || 0));
  return { id, beforeWallet: before.wallet, afterWallet: after.wallet, inventory: after.inventory };
}
const hud = () => d.evaluate(() => {
  const paragraphs = [...document.querySelectorAll("p")];
  const next = (label) => paragraphs.find((p) => p.textContent.trim() === label)?.nextElementSibling?.textContent || "";
  const phase = paragraphs.some((p) => p.textContent.trim() === "Aquecer") ? "heat" : paragraphs.some((p) => p.textContent.trim() === "Martelar") ? "forge" : paragraphs.some((p) => p.textContent.trim() === "Temperar") ? "quench" : "other";
  return { phase, heat: parseFloat(next("Calor")), strikes: parseInt(next("Golpes"), 10), integrity: parseFloat(next("Integridade")), shape: parseFloat(next("Forma")) };
});
async function holdCanvas(duration) {
  const point = await d.evaluate(() => {
    const canvas = document.querySelector("canvas"); if (!canvas) throw Error("Forge canvas absent");
    const r = canvas.getBoundingClientRect();
    for (const y of [0.55,0.62,0.48,0.7,0.4]) for (const x of [0.5,0.7,0.3]) {
      const p = { x:r.x+r.width*x, y:r.y+r.height*y };
      if(document.elementFromPoint(p.x,p.y)===canvas) return p;
    }
    throw Error("No unobstructed forge canvas point");
  });
  d.swipe(point.x,point.y,point.x,point.y,duration); await pause(200);
}

try {
  report.environment = d.environment();
  if (phase === "prepare-upgrade" || phase === "seed-fixture") {
    if(phase === "prepare-upgrade") {
    const apk = arg("apk", ""); assert(existsSync(apk), "Old APK path required.");
    const bytes = readFileSync(apk); const sha256 = hash(bytes);
    assert.equal(sha256, "02e7ec2b01badbd848adf4212fc9e2a9abf2ce57aacd093747220cfbd0e8be8d", "Old APK must match supplied 0.2.1 hash.");
    report.previousPackage = d.shell("pm", "list", "packages", app);
    report.installedOld = { apk, sha256, output: d.cmd(["install", "-r", apk]) };
    report.package = d.shell("dumpsys", "package", app).split(/\r?\n/).filter((line) => /versionCode=|versionName=/.test(line)).join("\n");
    assert(report.package.includes("versionCode=3") && report.package.includes("versionName=0.2.1"));
    report.launch = process.argv.includes("--attach-current") ? await d.attach() : await d.launch();
    const backup = await d.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((key) => [key,localStorage.getItem(key)])));
    saveArtifact("android-original-storage-backup.json", backup);
    d.detach(); d.shell("am", "force-stop", app);
    const tar = d.cmd(["exec-out", "run-as", app, "tar", "-cf", "-", "app_webview"], true);
    writeFileSync(join(evidence,"android-original-app-webview.tar"),tar);
    report.backup = { storageKeys:Object.keys(backup), storageSha256:hash(JSON.stringify(backup)), nativeTarSha256:hash(tar), nativeTarBytes:tar.length };
    }
    await d.launch();
    await d.evaluate((save) => { localStorage.setItem("a-forja-save",JSON.stringify(save)); },fixture);
    assert.deepEqual(relevant(await d.readSave()),relevant(fixture));
    // WebView flushes its backing LevelDB asynchronously. Give the explicitly
    // seeded test data one background flush before force-stop, rather than
    // mistaking immediate termination of a CDP write for an app transaction.
    d.shell("input","keyevent","3"); await pause(1800);
    await d.launch();
    const beforeUpdate = await d.readSave();
    assert.deepEqual(relevant(beforeUpdate),relevant(fixture));
    saveArtifact("android-before-upgrade-save.json",beforeUpdate);
    report.fixtureFingerprint = hash(JSON.stringify(relevant(beforeUpdate)));
    d.screenshot("01-old-apk-seeded-before-upgrade");
    saveArtifact("android-upgrade-expected.json",{ fingerprint:report.fixtureFingerprint,save:beforeUpdate });
  } else if (phase === "run") {
    report.package = d.shell("dumpsys", "package", app).split(/\r?\n/).filter((line) => /versionCode=|versionName=/.test(line)).join("\n");
    assert(report.package.includes("versionCode=4") && report.package.includes("versionName=0.2.2"), "Install the approved candidate before the journey.");
    const installedPath=d.shell("pm","path",app).replace(/^package:/,"").trim();
    report.installedApk={path:installedPath,sha256:hash(d.cmd(["exec-out","cat",installedPath],true))};
    assert.equal(report.installedApk.sha256,"d528b890f9f83a2299f105874084bf8e7f8717e5c86a5cf920b74a393fc40f56");
    report.launch = await d.launch();
    await step("0.2.1-to-0.2.2-update-preserves-fixture-without-clearing-app",async()=>{
      const expected=JSON.parse(readFileSync(join(evidence,"android-upgrade-expected.json"),"utf8"));
      const saved=await d.readSave(); assert.deepEqual(relevant(saved),relevant(expected.save));
      return {before:expected.fingerprint,after:hash(JSON.stringify(relevant(saved))),equal:true};
    });
    await d.nav("Loja");
    await step("shop-steel-metal-purchase",()=>buy("Metais e materiais","Barra de Aço Nobre do Reino","steel"));
    await step("shop-catalyst-purchase",()=>buy("Catalisadores","Catalisador Astral do Crisol","catalyst_astral"));
    await step("shop-two-guard-purchases",async()=>{
      const first=await buy("Guardas","Guarda Curva de Falchion","guard_curved_falchion");
      const second=await buy("Guardas","Guarda em Cruz Clássica","guard_cross_iron");
      return {first,second};
    });
    d.screenshot("02-shop-purchases");
    await step("collection-install-and-replace-guard-returning-first-to-inventory",async()=>{
      await d.nav("Coleção"); await button("Prova Android 85",false,"main");
      const before=(await d.readSave()).gallery.find((s)=>s.id==="codex08_emulator_85");
      await button("Instalar",true,'[role="dialog"]'); await button("Guarda Curva de Falchion",false,'[role="dialog"]');
      const installed=(await d.readSave()).gallery.find((s)=>s.id===before.id);
      assert(installed.defense>before.defense); assert.equal(installed.installedComponents.guard.componentKey,"guard_curved");
      await button("Trocar",true,'[role="dialog"]'); await button("Guarda em Cruz Clássica",false,'[role="dialog"]');
      const after=await d.readSave(); const replaced=after.gallery.find((s)=>s.id===before.id);
      assert.equal(replaced.installedComponents.guard.componentKey,"guard_cross");
      assert(after.inventory.components.some((c)=>c.componentKey==="guard_curved"));
      assert(!after.inventory.components.some((c)=>c.componentKey==="guard_cross"));
      d.screenshot("03-installed-and-replaced"); await close();
      return {before,installed,replaced,returnedComponents:after.inventory.components};
    });
    let core=(await d.readSave()).inventory.fusionCores[0];
    await step("craft-four-rara-donors-free-quality-catalyst-fusion-real-core",async()=>{
      await d.nav("Craft"); await button("Selecionar espada");
      for(const quality of [72,85,91,96]) await d.tap({selector:"button",name:"Escolher",exact:true,rowText:`Prova Android ${quality}`,scope:'[role="dialog"]'});
      await button("Usar seleção");
      await d.tap({selector:"label",name:"Catalisador"});
      const before=await d.readSave();
      await button("Revisar fusão"); await button("Confirmar fusão",false,'[role="dialog"]');
      await text("O núcleo ainda precisa ser forjado");
      const after=await d.readSave(); assert.equal(after.gallery.length,0); assert.equal(after.inventory.fusionCores.length,1);
      assert.equal(after.inventory.materials.catalyst_astral,before.inventory.materials.catalyst_astral-1);
      core=after.inventory.fusionCores[0]; assert.equal(core.consumedSwordIds.length,4);
      d.screenshot("04-fusion-core"); await button("Guardar núcleo",true);
      return {beforeWallet:before.wallet,afterWallet:after.wallet,core};
    });
    await step("core-survives-process-reopen",async()=>{
      await d.launch(); const saved=await d.readSave(); assert(saved.inventory.fusionCores.some((c)=>c.id===core.id));
      await d.nav("Coleção"); await tab("Núcleos"); await button("Preparar na Forja");
      await text("Núcleo de Fusão Ativo"); d.screenshot("05-core-preparation");
      return {coreId:core.id,inventory:saved.inventory};
    });
    let runId;
    await step("core-forge-start-eight-native-strikes-and-quench",async()=>{
      const beforeStart=await d.readSave(); const material=getRequiredMaterialForSteel(core.steel);
      await button("Forjar o Núcleo");
      const saved=await d.readSave(); const attempt=saved.activeForgeAttempt; assert(attempt); runId=attempt.forgeRunId;
      assert.equal(attempt.activeCoreId,core.id);
      assert(saved.inventory.fusionCores.some((c)=>c.id===core.id),"Core remains reserved until completed forge");
      assert.equal(saved.inventory.materials[material.key],beforeStart.inventory.materials[material.key]-1,"Forging must consume exactly one purchased metal");
      await poll(hud,(value)=>value.phase==="heat"&&value.heat>=65,"forge heat >=65",20000);
      await button("Retirar do fogo");
      const strikes=[];
      for(let index=0;index<8;index++){
        let state=await hud();
        if(state.heat<58){await button("Reaquecer na fornalha"); await poll(hud,(value)=>value.heat>=74,"reheat>=74",15000);}
        await button(["Base [1]","Centro [2]","Ponta [3]"][index%3]);
        state=await hud(); await holdCanvas(525);
        const after=await poll(hud,(value)=>value.phase!=="forge"||value.strikes>state.strikes,"native strike reflected",8000);
        strikes.push(after); assert(after.phase==="forge"||after.phase==="quench","Blade must remain intact");
      }
      assert.equal((await hud()).phase,"quench"); d.screenshot("06-quench");
      await holdCanvas(1080); await text("Ver no Arsenal"); d.screenshot("07-weapon-reveal");
      const finished=await d.readSave(); const result=finished.gallery.find((s)=>s.forgeRunId===runId);
      assert(result&&!result.broken); assert.equal(result.fusionHistory.parentIds.length,4); assert.equal(finished.activeForgeAttempt,null);
      assert(!finished.inventory.fusionCores.some((c)=>c.id===core.id),"Completed forge consumes its core exactly once");
      return {runId,metal:{key:material.key,before:beforeStart.inventory.materials[material.key],after:saved.inventory.materials[material.key]},strikes,result};
    });
    await step("new-weapon-and-transaction-effects-survive-process-reopen",async()=>{
      await button("Ver no Arsenal"); const before=await d.readSave();
      await d.launch(); const after=await d.readSave(); assert.deepEqual(relevant(after),relevant(before));
      await d.nav("Coleção"); const forged=after.gallery.find((s)=>s.forgeRunId===runId); await button(forged.design.name,false,"main");
      await text("Histórico de fusão"); d.screenshot("08-persisted-inspection"); saveArtifact("android-final-save.json",after);
      return {runId,weaponId:forged.id,wallet:after.wallet,inventory:after.inventory,exactRelevantStatePreserved:true};
    });
    assert.equal(d.errors.length,0,"Runtime exception observed");
  } else {
    report.launch=await d.launch(false); report.body=await d.body(); report.save=await d.readSave(); d.screenshot("observation");
  }
  report.status="PASS";
} catch(error) {
  report.status="FAIL"; report.failure=error.stack; process.exitCode=1;
  report.bodyOnFailure=await d.body().catch(()=>""); report.saveOnFailure=await d.readSave().catch(()=>null);
  try{d.screenshot(`android-${phase}-failure`);}catch{ /* Preserve the original failure if screenshot capture also fails. */ }
} finally {
  report.pageErrors=d.errors; report.finishedAt=new Date().toISOString(); persist(); d.detach();
  console.log(JSON.stringify({status:report.status,phase,report:join(evidence,`android-${phase}-report.json`),failure:report.failure},null,2));
}
