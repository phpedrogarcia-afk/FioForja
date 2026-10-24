import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { test } from "node:test";

test("mobile asset copier packages runtime art and excludes evidence", async () => {
  const api = await import("./copy-mobile-game-assets.mjs").catch(() => null);
  assert.ok(api, "copy-mobile-game-assets.mjs must export the mobile asset copier");
  const temp = await mkdtemp(join(tmpdir(), "fioforja-mobile-assets-"));
  try {
    const publicDir = join(temp, "public");
    const outputDir = join(temp, "output");
    for (const relativePath of api.MOBILE_GAME_ASSETS) {
      const sourcePath = join(publicDir, relativePath);
      await mkdir(dirname(sourcePath), { recursive: true });
      await writeFile(sourcePath, relativePath);
    }
    const evidencePath = join(publicDir, "game", "evidence", "must-not-ship.png");
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, "evidence");
    await api.copyMobileGameAssets({ publicDir, outputDir });
    for (const relativePath of api.MOBILE_GAME_ASSETS) {
      assert.equal(await readFile(join(outputDir, relativePath), "utf8"), relativePath);
    }
    await assert.rejects(access(join(outputDir, "game", "evidence", "must-not-ship.png")));
  } finally {
    const tempRoot = resolve(tmpdir()) + sep;
    const target = resolve(temp);
    assert.ok(target.startsWith(tempRoot), "temporary cleanup must stay inside the OS temp directory");
    await rm(target, { recursive: true, force: true });
  }
});

test("mobile asset copier fails when a required game asset is missing", async () => {
  const api = await import("./copy-mobile-game-assets.mjs").catch(() => null);
  assert.ok(api, "copy-mobile-game-assets.mjs must export the mobile asset copier");
  const temp = await mkdtemp(join(tmpdir(), "fioforja-mobile-assets-missing-"));
  try {
    await assert.rejects(
      api.copyMobileGameAssets({ publicDir: join(temp, "empty"), outputDir: join(temp, "output") }),
      /Missing required mobile asset:/,
    );
  } finally {
    const tempRoot = resolve(tmpdir()) + sep;
    const target = resolve(temp);
    assert.ok(target.startsWith(tempRoot), "temporary cleanup must stay inside the OS temp directory");
    await rm(target, { recursive: true, force: true });
  }
});
