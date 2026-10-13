import test from "node:test";
import assert from "node:assert/strict";
import { rankFor, performanceScore } from "./performance.ts";
import { claimRewards, emptyCollection } from "./collection.ts";
import { rollReward } from "./rewards.ts";
import { DEFAULT_DESIGN } from "./catalog.ts";
import { createSim, stepSim, finishSword } from "./sim.ts";
import { forgeLayout } from "./layout.ts";

test("rank boundaries are total and exact, broken blades always fail", () => {
  for (const [value, rank] of [
    [49, "F"],
    [50, "C"],
    [59, "C"],
    [60, "B"],
    [79, "B"],
    [80, "A"],
    [94, "A"],
    [95, "S"],
    [100, "S"],
  ] as const)
    assert.equal(rankFor(value, false), rank);
  assert.equal(rankFor(100, true), "F");
});
test("performance requires timing, thermal control and quench", () => {
  assert.equal(performanceScore(100, 100, 100), 100);
  assert.equal(performanceScore(100, 0, 0), 60);
  assert.equal(performanceScore(0, 100, 100), 40);
});
test("skill rewards do not randomly promote poor execution", () => {
  for (let i = 0; i < 40; i++) {
    const reward = rollReward({
      design: DEFAULT_DESIGN,
      quality: 49,
      heatScore: 100,
      forgeScore: 100,
      quenchScore: 100,
      warp: 0,
      perfects: 8,
      strikes: 8,
      broken: false,
      performance: 49,
    });
    assert.equal(reward.rank, "F");
    assert.equal(reward.rarity, "quebrada");
    assert.deepEqual(
      reward.drops.map((d) => d.id),
      ["scrap"],
    );
  }
});
test("S drops unlock components exactly once", () => {
  const reward = rollReward({
    design: DEFAULT_DESIGN,
    quality: 98,
    heatScore: 98,
    forgeScore: 98,
    quenchScore: 98,
    warp: 0,
    perfects: 8,
    strikes: 8,
    broken: false,
    performance: 98,
  });
  const first = claimRewards(emptyCollection(), "sword-1", reward.drops);
  assert.ok(first.unlocked.includes("meteor"));
  assert.ok(first.unlocked.includes("ancestral"));
  assert.deepEqual(claimRewards(first, "sword-1", reward.drops), first);
});
test("same gameplay can earn S without material bonus or randomness", () => {
  const design = { ...DEFAULT_DESIGN, steel: "iron" as const };
  const s = createSim(design);
  s.phase = "forge";
  s.heat = 0.67;
  s.heatScore = 100;
  for (let i = 0; i < 8; i++) {
    s.heat = 0.67;
    s.charging = true;
    s.force = 0.58;
    stepSim(s, 0, { charging: false, action: false, reheat: false }, design, 0);
  }
  s.quenching = true;
  s.quenchFill = 0.52;
  stepSim(s, 0, { charging: false, action: false, reheat: false }, design, 0);
  assert.equal(rankFor(finishSword(s, design).performance, s.broken), "S");
});
test("profiles alter strike window and hammer mass", () => {
  const short = createSim({ ...DEFAULT_DESIGN, profile: "saber" });
  const heavy = createSim({ ...DEFAULT_DESIGN, profile: "claymore" });
  assert.ok(short.sweetWidth < heavy.sweetWidth);
});
test("workpiece fits both portrait and landscape safe scene area", () => {
  for (const [w, h] of [
    [360, 640],
    [390, 844],
    [768, 1024],
    [1440, 900],
    [844, 390],
  ]) {
    const l = forgeLayout(w, h, DEFAULT_DESIGN);
    assert.ok(l.blade.x >= 0 && l.tip.x <= w - 12);
    assert.ok(l.tip.y > l.safeTop && l.blade.y < l.safeBottom);
  }
});

test("old saves retain every sword, migrate grades without manufacturing unlocks", async () => {
  const { migrateSave } = await import("./save.ts");
  const old = {
    version: 2,
    gallery: Array.from({ length: 30 }, (_, i) => ({
      id: `old-${i}`,
      design: DEFAULT_DESIGN,
      quality: 98,
      grade: "Lendária",
      rarity: "lendaria",
    })),
    lastDesign: DEFAULT_DESIGN,
  };
  const next = migrateSave(old);
  assert.equal(next.gallery.length, 30);
  assert.equal(next.gallery[0]?.grade, "Obra-prima");
  assert.deepEqual(next.gallery[0]?.drops, []);
  assert.equal(next.collection.unlocked.includes("meteor"), false);
});
test("invalid save fields do not produce broken UI values", async () => {
  const { migrateSave } = await import("./save.ts");
  const next = migrateSave({
    gallery: [{ id: "bad", quality: NaN, design: { profile: "not-a-profile", steel: "??" } }],
    collection: { claimed: null, unlocked: [], items: null },
    lastDesign: { length: 999 },
  });
  assert.equal(next.gallery[0]?.design.profile, "long");
  assert.equal(next.lastDesign.length, 1.2);
  assert.ok(Number.isFinite(next.gallery[0]?.quality));
  assert.ok(next.collection.unlocked.includes("steel"));
});

test("scrap recycling requires three pieces and consumes them once", async () => {
  const { recycleScrap } = await import("./collection.ts");
  const c = { ...emptyCollection(), scrap: 2, items: { scrap: 2 } };
  assert.equal(recycleScrap(c), c);
  const recycled = recycleScrap({ ...c, scrap: 3, items: { scrap: 3 } });
  assert.equal(recycled.scrap, 0);
  assert.equal(recycled.items.refined, 1);
  assert.equal(recycled.items.scrap, 0);
});

test("quench blade stays in frame and physically enters the bath", async () => {
  const { workpiecePose } = await import("./layout.ts");
  for (const [w, h] of [
    [390, 844],
    [1440, 900],
    [844, 390],
  ]) {
    const start = workpiecePose(w, h, DEFAULT_DESIGN, "quench", false, 0);
    const end = workpiecePose(w, h, DEFAULT_DESIGN, "quench", false, 1);
    assert.ok(end.y > start.y);
    const actual = end.length * (0.55 + DEFAULT_DESIGN.length * 0.45);
    assert.ok(end.y + Math.sin(end.angle) * actual < h - 110);
  }
});
test("cancelled input never becomes a strike or an accidental quench", () => {
  const s = createSim(DEFAULT_DESIGN);
  s.phase = "forge";
  s.charging = true;
  s.force = 0.8;
  stepSim(
    s,
    0.02,
    { charging: false, action: false, reheat: false, cancel: true },
    DEFAULT_DESIGN,
    0,
  );
  assert.equal(s.strikes, 0);
  assert.equal(s.force, 0);
});

test("reheating announces completion at the material thermal midpoint", () => {
  const s = createSim(DEFAULT_DESIGN);
  s.phase = "forge";
  s.heat = 0.3;
  stepSim(s, 0.01, { charging: false, action: false, reheat: true }, DEFAULT_DESIGN, 0);
  for (let i = 0; i < 100 && s.reheating; i++)
    stepSim(s, 0.05, { charging: false, action: false, reheat: false }, DEFAULT_DESIGN, i * 0.05);
  assert.equal(s.reheating, false);
  assert.ok(s.heat > 0.65 && s.heat < 0.71);
  assert.ok(!s.lastMessage.includes("Reaquecendo"));
});
