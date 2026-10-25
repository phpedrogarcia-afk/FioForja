// Companion prototype only. Does not invoke or replace the production APK recipe.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMobileGameAssets } from "../../scripts/copy-mobile-game-assets.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const native = join(root, "APK", "mobile-ux-native");
const sdk = process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA, "Android", "Sdk");
const jdk = process.env.FIOFORJA_JDK_HOME || join(process.env.LOCALAPPDATA, "Programs", "FioForja", "jdk-21");
const env = { ...process.env, JAVA_HOME: jdk, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env, windowsHide: true, stdio: "inherit", shell: /\.bat$/i.test(command) });
  if (result.error || result.status !== 0) throw result.error || new Error(`Build failed: ${command} (${result.status})`);
};
if (!existsSync(join(jdk, "bin/java.exe"))) throw new Error("JDK21 local ausente");
run(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--config", "experiments/mobile-ux-v1/vite.config.ts"]);
mkdirSync(native, { recursive: true });
const files = execFileSync("git", ["ls-files", "android"], { cwd: root, encoding: "utf8", windowsHide: true }).trim().split("\n");
for (const file of files) {
  const target = join(native, file.slice("android/".length));
  mkdirSync(dirname(target), { recursive: true }); cpSync(join(root, file), target);
}
const slash = path => path.replaceAll("\\", "/");
writeFileSync(join(native, "local.properties"), `sdk.dir=${sdk.replaceAll("\\", "\\\\")}\n`);
const gradle = join(native, "app/build.gradle");
writeFileSync(gradle, readFileSync(gradle, "utf8").replace('applicationId "com.projetofio.fioforja"', 'applicationId "com.projetofio.fioforja.prototype"').replace('versionName "0.1.0"', 'versionName "0.1.0-prototype"'));
const strings = join(native, "app/src/main/res/values/strings.xml");
writeFileSync(strings, readFileSync(strings, "utf8").replaceAll(">FioForja<", ">FioForja Protótipo<"));
for (const file of ["capacitor.settings.gradle"]) {
  const path = join(native, file);
  writeFileSync(path, readFileSync(path, "utf8").replaceAll("../node_modules/", slash(join(root, "node_modules")) + "/"));
}
cpSync(join(root, "android/capacitor-cordova-android-plugins"), join(native, "capacitor-cordova-android-plugins"), { recursive: true });
const publicAssets = join(native, "app/src/main/assets/public");
if (resolve(publicAssets) !== resolve(root, "APK/mobile-ux-native/app/src/main/assets/public")) throw new Error("Diretório de saída inesperado");
rmSync(publicAssets, { recursive: true, force: true });
mkdirSync(publicAssets, { recursive: true });
cpSync(join(here, ".build"), publicAssets, { recursive: true });
await copyMobileGameAssets({ publicDir: join(root, "public"), outputDir: publicAssets });
const assets = dirname(publicAssets);
writeFileSync(join(assets, "capacitor.config.json"), JSON.stringify({ appId: "com.projetofio.fioforja.prototype", appName: "FioForja Protótipo", webDir: ".build", server: { androidScheme: "https" } }));
cpSync(join(root, "android/app/src/main/assets/capacitor.plugins.json"), join(assets, "capacitor.plugins.json"));
run(join(native, "gradlew.bat"), ["assembleDebug"], native);
const apk = join(root, "APK", "FioForja-prototipo-ux.apk");
cpSync(join(native, "app/build/outputs/apk/debug/app-debug.apk"), apk);
console.log(`COMPANION_APK=${apk}`);
