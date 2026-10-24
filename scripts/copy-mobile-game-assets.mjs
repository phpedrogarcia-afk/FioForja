import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export const MOBILE_GAME_ASSETS = Object.freeze([
  "game/bg-forge.jpg",
  "game/hand.png",
  "game/hand-strike.png",
  "game/sparks.png",
  "game/fire.png",
  "game/anvil.png",
  "game/experimental/r4b-forge-bg.png",
  "game/experimental/r4b-anvil.png",
  "game/forge-action.jpg",
  "game/inspection-velvet.jpg",
  "game/rewards-chest.jpg",
]);

function isInside(root, target) {
  const relativePath = relative(root, target);
  return relativePath !== "" && relativePath !== ".." &&
    !relativePath.startsWith(".." + sep) && !isAbsolute(relativePath);
}

export async function copyMobileGameAssets({ publicDir, outputDir }) {
  const sourceRoot = resolve(publicDir);
  const outputRoot = resolve(outputDir);

  for (const relativePath of MOBILE_GAME_ASSETS) {
    const source = resolve(sourceRoot, relativePath);
    const destination = resolve(outputRoot, relativePath);
    if (!isInside(sourceRoot, source) || !isInside(outputRoot, destination)) {
      throw new Error("Invalid mobile asset path: " + relativePath);
    }
    try {
      await access(source);
    } catch {
      throw new Error("Missing required mobile asset: " + relativePath);
    }
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  return [...MOBILE_GAME_ASSETS];
}
