# M01-R4B — New Forge Workspace Prototype

**RESULT: PARTIAL. RECOMMENDATION: ADAPT.** Branch `exp/m01-r4b-new-workspace`, base/HEAD `f476539f636425973481d6b33062a2fa43367df9`. Candidate uncommitted and playable at `http://127.0.0.1:8080/` while the local development server is running. This is a composition experiment, not approved production art or a human game-feel verdict.

## Scope and asset gate

The two user-supplied concept images were copied without editing to [experimental assets](../public/game/experimental/). The background is 1659×948 RGBA, with a readable furnace left, quench bath right, and open central foreground. It has no central baked-in anvil, embedded sword, or hand. A peripheral hammer remains baked into the lower right, so the background is still prototype art. Its alpha spans 2–248, and the renderer fills a dark color behind it. Resolution is sufficient for the two tested viewports.

The independent anvil is 1254×1254 RGBA. Its corners have alpha 0 and 991,647 pixels are fully transparent: **ANVIL_ALPHA = TRUE**, with no black baked background. It exposes substantially more top plane than the old `anvil.png`, accepts the current renderer's blade footprint, and has broadly compatible warm-left/cool-right lighting. The old `bg-forge.jpg` and `anvil.png` remain intact. This removes the [M01-R4A asset blocker](M01-R4A-forge-view.md) for a prototype, without proving the final composition.

## Candidate and method

Only [ForgeCanvas](../src/game/ForgeCanvas.tsx) and [asset registration](../src/game/assets.ts) changed in runtime. The new background and independent anvil are composited without perspective skew. In FORGE, the top plane fills the foreground, with the existing workpiece renderer and a small contact shadow. The existing hand and strike sprites, M01-R2 rest lift, input, simulation, scoring, HUD, and sword renderer remain. Portrait shifts the scene focus between furnace, anvil, and bath. In HEAT the anvil is absent from the composition and the workpiece is placed near the furnace; in QUENCH the workpiece is placed over the bath. No new gameplay behavior is implied by those placements.

The [capture harness](M01-R4B/capture.mjs) advanced the real UI with fixed clock/seed in Edge headless 156.0.4314.8, DPR 1, default design. It captured HEAT, FORGE REST, FORGE CHARGE, IMPACT, and QUENCH at 390×844 and 1366×768. [Measurements and source hashes](M01-R4B/evidence/measurements.json) record HUD phase, logical blade clipping, sprite alpha overlap, intended impact anchor, and its position relative to a conservative polygon on the visible anvil top. `npm.cmd run typecheck` passed. No human played or judged the candidate.

| Viewport | Workpiece visible HEAT / REST / CHARGE / IMPACT / QUENCH | Hand overlap REST / CHARGE / IMPACT | Intended impact anchor | On visible anvil top |
|---|---|---|---|---|
| 390×844 | 100 / 100 / 100 / 100 / 99.97% | 39.36 / 24.22 / 19.62% | ≈(171.6, 463.0) px | YES, geometric |
| 1366×768 | 100 / 100 / 100 / 100 / 100% | 16.65 / 31.38 / 14.37% | ≈(736.4, 425.6) px | YES, geometric |

The geometric YES means the **intended** anchor is inside the selected usable-top polygon, not that the hammer art physically touches it. The blade fraction is logical viewport clipping, not perceptual readability. Compared with the frozen [M01-R2 donor](M01-R2-forge-composition.md), portrait resting overlap worsened from about 31% to 39%; charge overlap worsened from about 11% to 24% in portrait and 31% on desktop. Do not interpret full viewport visibility as the workpiece being the visual hero.

## Visual findings and counterexamples

**OBSERVED:** The anvil has a large readable top and the blade lies in its plane in both FORGE viewports. The furnace and bath remain visible in the larger scene, and portrait uses the same workspace assets. The hammer remains visually large. The new top-oblique image is materially different from the old side-on baked-anvil background.

**HAND_ASSET_MISMATCH:** The reused resting arm visually lies across the anvil and crosses the blade; in the captured impact the hammer head is left/above the blade while the intended anchor lies on the blade. The strike sprite and spark-sheet graphic do not prove physical contact, even though the computed anchor is valid. The charge pose crosses the new work plane differently in portrait and desktop. **HAND_COMPATIBILITY = PARTIAL** for scale/presence, incompatible at demonstrated strike contact. No heavy anatomy warp or replacement art was attempted.

**OTHER LIMITS:** The existing low-shape renderer shows a pale oval near the furnace rather than an identifiable elongated billet; this violates the future [visual target](../docs/specs/ideal-forge-screen.md), though it predates this experiment. Mid-forge the thin pale/pink blade is secondary to the photorealistic anvil and is partly occluded. At QUENCH the blade is placed over the bath, but no credible immersion/depth mask is implemented. The background and anvil agree broadly in light direction, yet their exact scale and physical footing are unproven. Phase camera changes are discrete; motion feel is a human question. The old fire overlay was omitted because the new background already contains fire, which also removes that prior animated layer.

These counterexamples fail the mission's strict PASS conditions for believable hammer contact and the workpiece as visual hero. The candidate remains useful for evaluating camera and the independent anvil, so **PARTIAL** is more precise than rejecting the assets. M01-R2 remains an ADAPT/DONOR candidate, not a final approved camera; current implementation and the [canonical direction](../docs/specs/forge-visual-model.md) remain distinct.

## Evidence and human review

Frames: [portrait HEAT](M01-R4B/evidence/390x844-heat.jpeg), [REST](M01-R4B/evidence/390x844-forge-rest.jpeg), [CHARGE](M01-R4B/evidence/390x844-forge-charge.jpeg), [IMPACT](M01-R4B/evidence/390x844-impact.jpeg), [QUENCH](M01-R4B/evidence/390x844-quench.jpeg); [desktop HEAT](M01-R4B/evidence/1366x768-heat.jpeg), [REST](M01-R4B/evidence/1366x768-forge-rest.jpeg), [CHARGE](M01-R4B/evidence/1366x768-forge-charge.jpeg), [IMPACT](M01-R4B/evidence/1366x768-impact.jpeg), [QUENCH](M01-R4B/evidence/1366x768-quench.jpeg).

For human validation, ask without suggesting answers: Does it feel like standing at the anvil? Is the top clear? Does the sword rest on it and lead the scene? Does the hammer feel heavy and its contact believable? Does the furnace connect to the same process? Does portrait still feel like the same forge? Is this closer to the approved visual north star? The current captures answer none of these as game-feel facts.

No commit, push, or merge was made. Next decision within this branch is whether to adapt the hand/impact art and workpiece depiction; neither is authorized by this experiment alone.
