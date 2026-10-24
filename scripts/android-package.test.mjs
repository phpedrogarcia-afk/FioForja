import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readProjectFile = (relativePath) =>
  readFile(new URL("../" + relativePath, import.meta.url), "utf8");

test("package exposes the static mobile and one-command APK builds", async () => {
  const manifest = JSON.parse(await readProjectFile("package.json"));
  assert.equal(manifest.scripts["build:mobile"], "node scripts/build-mobile.mjs");
  assert.equal(manifest.scripts.apk, "node scripts/build-apk.mjs");
});

test("Capacitor loads the local static build and keeps a stable app identity", async () => {
  const config = await readProjectFile("capacitor.config.ts");
  assert.match(config, /appId:\s*"com\.projetofio\.fioforja"/);
  assert.match(config, /appName:\s*"FioForja"/);
  assert.match(config, /webDir:\s*"dist-mobile"/);
  assert.match(config, /androidScheme:\s*"https"/);
  assert.doesNotMatch(config, /url\s*:/i);
});

test("mobile entry is offline-ready and excludes the server application plugins", async () => {
  const html = await readProjectFile("mobile/index.html");
  const viteConfig = await readProjectFile("vite.mobile.config.ts");
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.match(viteConfig, /publicDir:\s*false/);
  assert.doesNotMatch(viteConfig, /tanstack|nitro/i);
});

test("Android manifest requests no permissions for offline gameplay", async () => {
  const manifest = await readProjectFile("android/app/src/main/AndroidManifest.xml");
  assert.doesNotMatch(manifest, /<uses-permission\b/);
});
