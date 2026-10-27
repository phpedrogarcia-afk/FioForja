// Explicit synthetic saves for UI validation. Never run against Android/player storage.
// Run from repository root: node --experimental-strip-types experiments/M03A-intuitive-preparation/create-fixture.mjs
// Optional output: dist-mobile/m03a-fixture.html, after building the APK.
import { writeFileSync } from "node:fs";
import { defaultSaveData } from "../../src/game/save.ts";
import { CANONICAL_PRESETS } from "../../src/game/catalog.ts";

const fixtures = {};
for (const mode of ["fresh", "progression", "empty", "locked", "core"]) {
  const save = structuredClone(defaultSaveData);
  if (!["fresh", "progression"].includes(mode)) {
    save.lastDesign = { ...CANONICAL_PRESETS[0].design };
    save.inventory.materials = { iron_ingot: 0, steel_ingot: 0 };
  }
  if (mode === "progression") save.career.totalForged = 7;
  if (mode === "locked") save.lastDesign = { ...CANONICAL_PRESETS[1].design };
  if (mode === "core") {
    save.wallet = { gold: 5000, rubies: 200, diamonds: 20 };
    save.inventory.fusionCores = [{
      id: "m03a_core_fixture", name: "Núcleo — Herança M03A", family: "royal", profile: "long",
      steel: "meteor", rarity: "Épica", bonusQuality: 10, inheritedPerks: ["Herança de teste"],
      consumedSwordIds: ["fixture_a", "fixture_b", "fixture_c", "fixture_d"], createdAt: 1,
      heritage: { attackBias: 18, defenseBias: 0, agilityBias: 0, durabilityBias: 0, runicAffinity: 0, dominantFamily: "royal", dominantSteel: "meteor" },
    }];
  }
  fixtures[mode] = save;
}
const output = process.argv[2] || "mobile/m03a-fixture.html";
writeFileSync(output, `<!doctype html><meta charset="utf-8"><title>M03A synthetic fixture</title><script>
const fixtures = ${JSON.stringify(fixtures)};
const mode = new URLSearchParams(location.search).get('mode');
if (!fixtures[mode]) throw Error('Select an explicit fixture');
localStorage.removeItem('a-forja-save-backup');
localStorage.setItem('a-forja-save', JSON.stringify(fixtures[mode]));
location.replace('/');
</script>`);
console.log(`Temporary fixture page written: ${output}. Remove after testing; do not package in APK.`);
