import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_PRESETS } from "../catalog.ts";
import { buildWeaponGeometry } from "./geometry.ts";
import { deriveWeaponVisualGenome } from "./weaponGenome.ts";
import { fitWeaponViewport } from "./weaponRenderer.ts";

describe("Weapon DNA na prévia de preparação", () => {
  it("mantém os limites geométricos dos projetos dentro da área com padding", () => {
    // Dimensões do canvas observado na M03A em 360×800 e 392×819 CSS px.
    const areas = [
      { width: 326, height: 282 },
      { width: 358, height: 289.59375 },
    ];
    const padding = 12;
    const angle = -Math.PI / 2;
    const tolerance = 1e-6;
    let cases = 0;

    assert.equal(CANONICAL_PRESETS.length, 8);
    for (const preset of CANONICAL_PRESETS) {
      for (const length of [0.75, 1.2]) {
        const genome = deriveWeaponVisualGenome({
          design: { ...preset.design, length },
          quality: 92,
        });
        // Os bounds incluem lâmina, guarda, cabo e pomo.
        const geometry = buildWeaponGeometry(genome);

        for (const { width, height } of areas) {
          const viewport = fitWeaponViewport(
            genome,
            width - padding * 2,
            height - padding * 2,
            angle,
          );
          const scale = viewport.lengthPx / geometry.bladeLength;
          for (const x of [geometry.bounds.minX, geometry.bounds.maxX]) {
            for (const y of [geometry.bounds.minY, geometry.bounds.maxY]) {
              const screenX =
                padding + viewport.x + (x * Math.cos(angle) - y * Math.sin(angle)) * scale;
              const screenY =
                padding + viewport.y + (x * Math.sin(angle) + y * Math.cos(angle)) * scale;
              const context = `${preset.id}, comprimento ${length}, ${width}×${height}`;
              assert.ok(screenX >= padding - tolerance, `${context}: esquerda`);
              assert.ok(screenX <= width - padding + tolerance, `${context}: direita`);
              assert.ok(screenY >= padding - tolerance, `${context}: topo`);
              assert.ok(screenY <= height - padding + tolerance, `${context}: base`);
            }
          }
          cases++;
        }
      }
    }
    assert.equal(cases, 32);
    // Limites geométricos não comprovam pixels, contornos antialias ou efeitos.
  });
});
