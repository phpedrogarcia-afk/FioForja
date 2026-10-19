import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { WeaponRenderMode } from "./rendererAdapter.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let moduleId = 0;
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});
async function resolve(url: string | null, stored: string | null, failure?: "getter" | "read") {
  const browser = {
    location: { href: `https://fioforja.invalid/${url === null ? "" : `?weaponRender=${encodeURIComponent(url)}`}` },
    get localStorage() {
      if (failure === "getter") throw new Error("storage blocked");
      return { getItem() { if (failure === "read") throw new Error("read blocked"); return stored; } };
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  // Separate module instance exercises public resolution without a production reset hook.
  const module = await import(`./rendererAdapter.ts?mode-case=${moduleId++}`) as typeof import("./rendererAdapter.ts");
  return module.resolveWeaponRenderMode();
}

describe("renderer mode URL and storage precedence", () => {
  const cases: Array<[string | null, string | null, WeaponRenderMode]> = [
    ["legacy", "dna", "legacy"], ["classic", "dna", "legacy"],
    ["dna", "legacy", "dna"], ["weapon-dna", "legacy", "dna"], ["weapondna", "legacy", "dna"],
    ["LEGACY", "DNA", "legacy"], ["DNA", "classic", "dna"],
    [null, "dna", "dna"], ["invalid", "dna", "dna"],
    [null, "legacy", "legacy"], [null, "invalid", "legacy"], [null, null, "legacy"],
  ];
  for (const [url, stored, expected] of cases) {
    it(`URL ${url} / stored ${stored} selects ${expected}`, async () => {
      assert.equal(await resolve(url, stored), expected);
    });
  }
  for (const failure of ["getter", "read"] as const) {
    it(`unavailable storage (${failure}) uses the default`, async () => {
      assert.equal(await resolve(null, null, failure), "legacy");
    });
    it(`explicit URL works with unavailable storage (${failure})`, async () => {
      assert.equal(await resolve("legacy", "dna", failure), "legacy");
    });
  }
});
