import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSim, stepSim, finishSword, generateForgeRewards } from "./sim.ts";
import { DEFAULT_DESIGN, calculateSwordAttributes } from "./catalog.ts";

describe("FioForja Simulator Core & Physical Metallurgy", () => {
  it("initializes with full structural integrity and stable state", () => {
    const sim = createSim(DEFAULT_DESIGN);
    assert.equal(sim.phase, "heat");
    assert.equal(sim.integrity, 100);
    assert.equal(sim.structuralState, "stable");
    assert.equal(sim.cracks, 0);
    assert.equal(sim.broken, false);
  });

  it("advances shape and charges runes on ideal temperature sweet spot strikes", () => {
    const sim = createSim({ ...DEFAULT_DESIGN, runes: true });
    // Pull out of furnace at ideal heat
    sim.heat = 0.68;
    stepSim(sim, 0.1, { action: true, charging: false, reheat: false }, DEFAULT_DESIGN, 1);
    assert.equal(sim.phase, "forge");

    // Perfect strike in sweet spot
    const initialShape = sim.shape;
    sim.charging = true;
    const strikeTime = 1.1;
    sim.force = 0.62 + Math.sin(strikeTime * 0.85) * 0.11;
    const ev = stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, strikeTime);

    assert.equal(ev.kind, "perfect");
    assert.ok(sim.shape > initialShape, "Shape should advance on perfect strike");
    assert.ok(sim.runicCharge > 0, "Runic charge should accumulate on perfect strike");
    assert.equal(sim.structuralState, "stable");
    assert.equal(sim.broken, false);
  });

  it("penalizes cold forging with structural stress and generates cracks", () => {
    const sim = createSim(DEFAULT_DESIGN);
    sim.phase = "forge";
    sim.heat = 0.25; // Cold steel!
    sim.charging = true;
    sim.force = 0.9; // Brutal force on cold metal

    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 2);

    assert.ok(sim.integrity < 100, "Cold strike must damage structural integrity");
    assert.ok(sim.integrity < 75, "Severe stress from cold brutal strike");
  });

  it("breaks the blade catastrophically if abused when cold or cracked", () => {
    const sim = createSim(DEFAULT_DESIGN);
    sim.phase = "forge";
    sim.heat = 0.2; // Frozen steel
    sim.integrity = 20;
    sim.cracks = 2;
    sim.charging = true;
    sim.force = 0.95;

    const ev = stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 3);

    assert.equal(sim.broken, true);
    assert.equal(sim.structuralState, "broken");
    assert.equal(sim.done, true);
    assert.equal(ev.sfx, "shatter");
  });

  it("reheating relieves stress and raises temperature safely", () => {
    const sim = createSim(DEFAULT_DESIGN);
    sim.phase = "forge";
    sim.heat = 0.35;
    sim.integrity = 80;

    // Trigger reheat
    stepSim(sim, 0.1, { action: false, charging: false, reheat: true }, DEFAULT_DESIGN, 4);
    assert.equal(sim.reheating, true);

    // Let furnace reheat for 0.5s
    stepSim(sim, 0.5, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 4.5);
    assert.ok(sim.heat > 0.45, "Heat should increase during reheat");
    assert.ok(sim.integrity > 80, "Integrity should recover through annealing");
  });

  it("calculates realistic physical attributes and perks based on craft", () => {
    // Masterwork quality execution
    const attrsMasterwork = calculateSwordAttributes(
      { ...DEFAULT_DESIGN, steel: "damascus", runes: true },
      98, // quality
      0.01, // warp
      96, // heatScore
      95, // forgeScore
      94, // quenchScore
    );

    assert.ok(attrsMasterwork.damage > 200, "Masterwork damage should be high");
    assert.ok(attrsMasterwork.durability >= 90, "Durability should be excellent");
    assert.equal(attrsMasterwork.flaws.length, 0, "Masterwork should have no flaws");
    assert.ok(attrsMasterwork.perks.some((p) => p.includes("Gume de Obra-prima")));
    assert.ok(attrsMasterwork.perks.some((p) => p.includes("Ressonância Rúnica")));

    // Poor / flawed execution
    const attrsFlawed = calculateSwordAttributes(
      DEFAULT_DESIGN,
      35, // quality
      0.35, // warp
      30, // heatScore
      35, // forgeScore
      25, // quenchScore
    );

    assert.ok(attrsFlawed.damage < attrsMasterwork.damage);
    assert.ok(attrsFlawed.flaws.length >= 2, "Poor execution must have explicit metallurgical flaws");
    assert.ok(attrsFlawed.flaws.some((f) => f.includes("Empenamento")));
  });

  it("generates forge celebration rewards conforming to Reference Image 3", () => {
    const sim = createSim({ ...DEFAULT_DESIGN, steel: "meteor", runes: true });
    sim.quality = 98;
    sim.shape = 1;
    sim.heatScore = 96;
    sim.quenchScore = 95;

    const finished = finishSword(sim, { ...DEFAULT_DESIGN, steel: "meteor", runes: true });
    assert.equal(finished.grade, "Obra-prima");
    assert.equal(finished.rarity, "Lendária");

    const rewards = generateForgeRewards(finished);
    assert.equal(rewards.rank, "S (98%)");
    assert.equal(rewards.gold, 4850);
    assert.equal(rewards.rubies, 165);
    assert.equal(rewards.diamonds, 165);
    assert.equal(rewards.items.length, 4);
    assert.equal(rewards.items[0].name, "Fiery Rune Stone");
    assert.equal(rewards.items[1].name, "Damascus Crossguard");
    assert.equal(rewards.items[2].name, "Dragon Leather Sword Grip");
    assert.equal(rewards.items[3].name, "Star Metal Ingot");
  });

  it("handles multi-zone targeting and awards Forge Harmony perk on balanced forging", () => {
    const sim = createSim(DEFAULT_DESIGN);
    sim.phase = "forge";
    sim.heat = 0.7; // ideal heat

    // Strike base twice
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false, switchZone: "base" }, DEFAULT_DESIGN, 1);
    assert.equal(sim.targetZone, "base");
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 1.1);
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 1.2);

    // Strike mid twice
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false, switchZone: "mid" }, DEFAULT_DESIGN, 2);
    assert.equal(sim.targetZone, "mid");
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 2.1);
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 2.2);

    // Strike tip twice
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false, switchZone: "tip" }, DEFAULT_DESIGN, 3);
    assert.equal(sim.targetZone, "tip");
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 3.1);
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 3.2);

    assert.ok(sim.zoneProgress.base >= 2);
    assert.ok(sim.zoneProgress.mid >= 2);
    assert.ok(sim.zoneProgress.tip >= 2);

    const finished = finishSword(sim, DEFAULT_DESIGN);
    assert.ok(
      finished.perks?.some((p) => p.includes("Harmonia da Forja")),
      "Balanced forging across all 3 zones must award Harmonia da Forja",
    );
  });

  it("adjusts strike dynamics according to equipped hammer tool", () => {
    // Sledge hammer: higher shape gain and higher stress
    const simSledge = createSim(DEFAULT_DESIGN, { hammer: "sledge" });
    assert.equal(simSledge.activeHammer, "sledge");

    // Precision hammer: faster charge and wider sweet spot
    const simPrecision = createSim(DEFAULT_DESIGN, { hammer: "precision" });
    assert.equal(simPrecision.activeHammer, "precision");
    simPrecision.phase = "forge";
    stepSim(simPrecision, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 1);
    assert.ok(simPrecision.sweetWidth > simSledge.sweetWidth, "Precision hammer should have wider sweet spot");
  });

  it("classifies Ancient Alloy masterwork as Relic tier", () => {
    const relicDesign = {
      ...DEFAULT_DESIGN,
      family: "relic" as const,
      steel: "ancient_alloy" as const,
      profile: "relic_blade" as const,
    };
    const sim = createSim(relicDesign);
    sim.quality = 96;
    sim.heatScore = 95;
    sim.quenchScore = 94;
    sim.shape = 1;

    const finished = finishSword(sim, relicDesign);
    assert.equal(finished.rarity, "Relíquia");
    assert.ok(finished.perks?.some((p) => p.includes("Herança dos Primeiros Homens")));
  });
});

describe("FioForja Economy, Save Migration & Workshop Progression", () => {
  it("provides backward-compatible defaults when loading legacy saves", async () => {
    const { loadSave, defaultWallet, defaultInventory, defaultCareer } = await import("./save.ts");
    const save = loadSave();
    assert.ok(save.wallet, "Save must have wallet");
    assert.equal(typeof save.wallet.gold, "number");
    assert.equal(typeof save.wallet.rubies, "number");
    assert.equal(typeof save.wallet.diamonds, "number");

    assert.ok(save.inventory, "Save must have inventory");
    assert.ok(Array.isArray(save.inventory.unlockedTools));
    assert.ok(
      save.inventory.unlockedTools.includes("hammer_standard"),
      "Standard hammer must always be unlocked",
    );

    assert.ok(save.career, "Save must have career stats");
    assert.equal(typeof save.career.totalForged, "number");
  });

  it("verifies workshop equipment prices and unlocks properly", async () => {
    const { WORKSHOP_EQUIPMENT } = await import("./catalog.ts");
    const stdHammer = WORKSHOP_EQUIPMENT.find((t) => t.id === "hammer_standard");
    const precHammer = WORKSHOP_EQUIPMENT.find((t) => t.id === "hammer_precision");
    const sledgeHammer = WORKSHOP_EQUIPMENT.find((t) => t.id === "hammer_sledge");

    assert.ok(stdHammer, "Standard hammer must exist");
    assert.equal(stdHammer.costGold, 0, "Standard hammer is free default");
    assert.equal(stdHammer.unlockedByDefault, true);

    assert.ok(precHammer, "Precision hammer must exist");
    assert.ok(precHammer.costGold > 0, "Precision hammer requires gold");
    assert.ok(precHammer.costRubies > 0, "Precision hammer requires rubies");

    assert.ok(sledgeHammer, "Sledge hammer must exist");
    assert.ok(sledgeHammer.costGold > precHammer.costGold, "Sledge is epic tier");
  });

  it("enforces career stats tracking and wallet crediting", async () => {
    const { generateForgeRewards } = await import("./sim.ts");
    const sim = createSim(DEFAULT_DESIGN);
    sim.quality = 90;
    sim.shape = 1;
    const finished = finishSword(sim, DEFAULT_DESIGN);
    const rewards = generateForgeRewards(finished);

    assert.ok(rewards.gold > 0, "Completed blade awards gold");
    assert.ok(rewards.rubies > 0, "Completed blade awards rubies");
    assert.ok(rewards.items.length > 0, "Completed blade drops crafting materials");
  });

  it("produces correct thermal radiation color scale across temperatures", async () => {
    const { metalColorCss } = await import("./swordDraw.ts");
    const coldColor = metalColorCss(0.05);
    const cherryColor = metalColorCss(0.5);
    const incandescenceColor = metalColorCss(0.85);

    assert.ok(coldColor.startsWith("#"), "Must return hex color");
    assert.ok(cherryColor.startsWith("#"), "Must return hex color");
    assert.ok(incandescenceColor.startsWith("#"), "Must return hex color");
    assert.notEqual(coldColor, incandescenceColor, "Cold steel and incandescent steel must differ visually");
  });

  it("updates PhysicalBladeProfile continuously across targeted strikes", () => {
    const sim = createSim(DEFAULT_DESIGN);
    sim.phase = "forge";
    sim.heat = 0.65;
    const initialBase = sim.physicalProfile.baseWidth;
    const initialMid = sim.physicalProfile.midWidth;
    const initialTip = sim.physicalProfile.tipWidth;

    // Strike base
    sim.targetZone = "base";
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 1);
    assert.ok(sim.physicalProfile.baseWidth > initialBase, "Base width must develop when striking base");
    assert.equal(sim.physicalProfile.midWidth, initialMid, "Mid width untouched when striking base");

    // Strike tip
    sim.targetZone = "tip";
    sim.charging = true;
    sim.force = sim.sweetCenter;
    stepSim(sim, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 2);
    assert.ok(sim.physicalProfile.tipWidth > initialTip, "Tip width must develop when striking tip");
    assert.ok(sim.physicalProfile.distalTaper > 0.08, "Distal taper must develop when striking tip");
  });

  it("applies equipped workshop gear bonuses accurately", () => {
    // Bluefire furnace heating acceleration
    const simStandard = createSim(DEFAULT_DESIGN, {
      equippedGear: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_coal", quench: "quench_water" },
    });
    const simBluefire = createSim(DEFAULT_DESIGN, {
      equippedGear: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_bluefire", quench: "quench_water" },
    });
    stepSim(simStandard, 1.0, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 1);
    stepSim(simBluefire, 1.0, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 1);
    assert.ok(simBluefire.heat > simStandard.heat, "Bluefire furnace heats faster than standard coal furnace");

    // Master anvil sweet spot bonus
    const simMasterAnvil = createSim(DEFAULT_DESIGN, {
      equippedGear: { hammer: "standard", anvil: "anvil_master", furnace: "furnace_coal", quench: "quench_water" },
    });
    assert.ok(simMasterAnvil.sweetWidth > simStandard.sweetWidth, "Master anvil expands forge sweet width");

    // Oil quench gentler cooling
    const simOil = createSim(DEFAULT_DESIGN, {
      equippedGear: { hammer: "standard", anvil: "anvil_cast", furnace: "furnace_coal", quench: "quench_oil" },
    });
    simOil.phase = "quench";
    simOil.quenchFill = 0.85; // Over-soaked quench
    simOil.charging = false;
    simOil.quenching = true;
    stepSim(simOil, 0.05, { action: false, charging: false, reheat: false }, DEFAULT_DESIGN, 2);
    assert.ok(simOil.warp < 0.15, "Oil quench limits thermal shock warp");
  });

  it("persists and migrates equipped gear in player inventory", async () => {
    const { migrateSave } = await import("./save.ts");
    const migrated = migrateSave({
      inventory: {
        unlockedTools: ["hammer_standard", "hammer_precision"],
        equipped: { hammer: "precision", anvil: "anvil_master", furnace: "furnace_bluefire", quench: "quench_oil" },
      },
    });

    assert.equal(migrated.inventory.equipped?.hammer, "precision");
    assert.equal(migrated.inventory.equipped?.anvil, "anvil_master");
    assert.equal(migrated.inventory.equipped?.furnace, "furnace_bluefire");
    assert.equal(migrated.inventory.equipped?.quench, "quench_oil");
  });
});


