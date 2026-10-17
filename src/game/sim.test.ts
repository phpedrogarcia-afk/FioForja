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
