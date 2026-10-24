import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMobileGameAssets } from "./copy-mobile-game-assets.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function main() {
  const viteCli = resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");
  const config = resolve(projectRoot, "vite.mobile.config.ts");
  const result = spawnSync(process.execPath, [viteCli, "build", "--config", config], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);

  const copied = await copyMobileGameAssets({
    publicDir: resolve(projectRoot, "public"),
    outputDir: resolve(projectRoot, "dist-mobile"),
  });
  console.log("[android] Built static GameApp bundle and copied " + copied.length + " runtime art files.");
  console.log("[android] Web directory: " + resolve(projectRoot, "dist-mobile"));
}

main().catch((error) => {
  console.error("[android] Mobile web build failed:", error);
  process.exitCode = 1;
});
