import assert from "node:assert/strict";
import { STEELS } from "./catalog.ts";
import { createForgeSnapshot, restoreForgeSnapshot, stepSim, type SimInput } from "./sim.ts";
import { executeForgeCheckpointTransaction } from "./transactions.ts";
import type { SaveData, SimState } from "./types.ts";

/** Exercises real furnace, charge/release, reheating, zones and quench; never injects finished scores. */
export function playForgeAttempt(initialSave: SaveData, options: { stopAfterStrikes?: number; poor?: boolean } = {}): { save: SaveData; sim: SimState } {
  let save = initialSave;
  const attempt = save.activeForgeAttempt!;
  const design = attempt.design;
  const sim = restoreForgeSnapshot(attempt.snapshot!)!;
  assert.ok(sim, "attempt must contain a valid physical checkpoint");
  const steel = STEELS[design.steel];
  for (let frame = 0; frame < 12000 && !sim.done; frame++) {
    const input: SimInput = { charging: false, action: false, reheat: false };
    if (sim.phase === "heat") input.action = sim.heat >= (options.poor ? .3 : (steel.heatMin + steel.heatMax) / 2);
    if (sim.phase === "forge") {
      input.switchZone = ["base", "mid", "tip"][sim.strikes % 3] as "base" | "mid" | "tip";
      if (!sim.charging && sim.heat < steel.heatMin + .05) input.reheat = true;
      else if (!sim.reheating) input.charging = sim.force < (options.poor ? .12 : sim.sweetCenter - .01);
    }
    if (sim.phase === "quench") input.charging = sim.quenchFill < (options.poor ? .1 : .52);
    const previousPhase = sim.phase;
    const event = stepSim(sim, .025, input, design, sim.elapsedTime + .025);
    if (event.kind || event.finished || sim.phase !== previousPhase) {
      const result = executeForgeCheckpointTransaction(save, createForgeSnapshot(sim, design, save.activeForgeAttempt!.snapshot!.revision + 1));
      assert.equal(result.success, true, result.code);
      save = result.save;
    }
    if (options.stopAfterStrikes && sim.strikes >= options.stopAfterStrikes) return { save, sim };
  }
  assert.equal(sim.done, true, "real input sequence must complete the forge");
  return { save, sim };
}
