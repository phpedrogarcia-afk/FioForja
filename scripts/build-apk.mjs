import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MOBILE_GAME_ASSETS } from "./copy-mobile-game-assets.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appId = "com.projetofio.fioforja";

function findSdk() {
  const userHome = process.env.USERPROFILE || homedir();
  const candidates = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    join(userHome, "AppData", "Local", "Android", "Sdk"),
    join(userHome, "Library", "Android", "sdk"),
    join(userHome, "Android", "Sdk"),
  ].filter(Boolean);
  return [...new Set(candidates.map((candidate) => resolve(candidate)))].find((candidate) =>
    existsSync(join(candidate, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")),
  );
}

function findJdk() {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const userHome = process.env.USERPROFILE || homedir();
  const localAppData = process.env.LOCALAPPDATA || join(userHome, "AppData", "Local");
  const candidates = [
    process.env.FIOFORJA_JDK_HOME,
    join(localAppData, "Programs", "FioForja", "jdk-21"),
    process.env.JAVA_HOME,
    join(programFiles, "Java", "jdk-21"),
    join(programFiles, "Java", "jdk-17"),
    join(programFiles, "Android", "Android Studio", "jbr"),
  ].filter(Boolean);
  const javaName = process.platform === "win32" ? "java.exe" : "java";
  const javacName = process.platform === "win32" ? "javac.exe" : "javac";
  for (const candidate of [...new Set(candidates.map((path) => resolve(path)))]) {
    const java = join(candidate, "bin", javaName);
    const javac = join(candidate, "bin", javacName);
    if (!existsSync(java) || !existsSync(javac)) continue;
    const version = spawnSync(java, ["-version"], { encoding: "utf8", windowsHide: true });
    const versionText = (version.stderr || "") + (version.stdout || "");
    if (/version\s+"21\./.test(versionText)) return candidate;
  }
  return undefined;
}

function execute(command, args, { cwd, env, capture = false } = {}) {
  const useBatch = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    windowsHide: true,
    shell: useBatch,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(command + " failed with exit code " + result.status + (output ? "\n" + output : ""));
  }
  return capture ? (result.stdout || "") + (result.stderr || "") : "";
}

async function sha256(filePath) {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

function readGit(args) {
  const result = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? result.stdout : "";
}

function deliveryDirectories(outputDir) {
  const firstWorktree = readGit(["worktree", "list", "--porcelain", "-z"]).split("\0\0")[0];
  const records = firstWorktree.split("\0");
  const primaryRoot = records.find((line) => line.startsWith("worktree "))?.slice(9);
  const primaryOutput = primaryRoot && !records.includes("bare") && existsSync(primaryRoot)
    ? join(primaryRoot, "APK")
    : outputDir;
  // Preserve the explicitly requested Windows delivery location after the checkout moved.
  const requestedOutput = process.platform === "win32" ? join(homedir(), "Documents", "FioForja", "APK") : undefined;
  return [...new Set([outputDir, primaryOutput, requestedOutput, process.env.FIOFORJA_APK_EXPORT_DIR].filter(Boolean).map((path) => resolve(path)))];
}

async function main() {
  const sdkRoot = findSdk();
  if (!sdkRoot) throw new Error("Android SDK not found. Set ANDROID_SDK_ROOT or install Android Studio with an SDK.");
  const androidJar = join(sdkRoot, "platforms", "android-36", "android.jar");
  if (!existsSync(androidJar)) throw new Error("Android API 36 is required by this Capacitor target. Install platform android-36.");
  const buildToolsRoot = join(sdkRoot, "build-tools");
  const buildTools = (await readdir(buildToolsRoot))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .reverse()
    .find((version) =>
      existsSync(join(buildToolsRoot, version, "aapt.exe")) &&
      existsSync(join(buildToolsRoot, version, "apksigner.bat")),
    );
  if (!buildTools) throw new Error("Android build-tools with aapt.exe and apksigner.bat were not found.");
  const aapt = join(buildToolsRoot, buildTools, "aapt.exe");
  const apksigner = join(buildToolsRoot, buildTools, "apksigner.bat");
  const jdk = findJdk();
  if (!jdk) throw new Error("A Java 21 JDK with java and javac was not found. Set FIOFORJA_JDK_HOME or JAVA_HOME.");

  const env = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    JAVA_HOME: jdk,
  };
  const localProperties = join(projectRoot, "android", "local.properties");
  const escapedSdk = sdkRoot.replaceAll("\\", "\\\\");
  await writeFile(localProperties, "sdk.dir=" + escapedSdk + "\n", "utf8");

  execute(process.execPath, [join(projectRoot, "scripts", "build-mobile.mjs")], { cwd: projectRoot, env });
  execute(process.execPath, [join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor"), "sync", "android"], {
    cwd: projectRoot,
    env,
  });

  const gradleWrapper = join(projectRoot, "android", "gradlew.bat");
  execute(gradleWrapper, ["assembleDebug"], { cwd: join(projectRoot, "android"), env });

  const apkPath = join(projectRoot, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  const apkStat = await stat(apkPath);
  if (!apkStat.isFile() || apkStat.size === 0) throw new Error("Gradle produced an empty or missing APK.");

  const badging = execute(aapt, ["dump", "badging", apkPath], { cwd: projectRoot, env, capture: true });
  const packageInfo = badging.match(/^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'/m);
  const minSdk = badging.match(/^sdkVersion:'([^']+)'/m)?.[1];
  const targetSdk = badging.match(/^targetSdkVersion:'([^']+)'/m)?.[1];
  if (!packageInfo) throw new Error("Android package metadata could not be read with aapt.");
  if (packageInfo[1] !== appId) throw new Error("Unexpected application ID: " + packageInfo[1]);
  if (!/^application-label:'FioForja'$/m.test(badging)) throw new Error("Unexpected application label.");
  if (minSdk !== "24" || targetSdk !== "36") throw new Error("Unexpected Android SDK metadata.");
  if (packageInfo[3] !== JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")).version) {
    throw new Error("Android versionName does not match package.json.");
  }

  const permissions = execute(aapt, ["dump", "permissions", apkPath], { cwd: projectRoot, env, capture: true });
  const requested = [...permissions.matchAll(/^uses-permission: name='([^']+)'/gm)].map((match) => match[1]);
  const unexpected = requested.filter((name) => name !== appId + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION");
  if (unexpected.length) throw new Error("Unexpected Android permissions: " + unexpected.join(", "));

  const listing = execute(aapt, ["list", apkPath], { cwd: projectRoot, env, capture: true });
  for (const asset of MOBILE_GAME_ASSETS) {
    const packagedPath = "assets/public/" + asset;
    if (!listing.split(/\r?\n/).includes(packagedPath)) {
      throw new Error("Required game asset is missing from APK: " + packagedPath);
    }
  }

  const signature = execute(apksigner, ["verify", "--verbose", "--print-certs", apkPath], {
    cwd: projectRoot,
    env,
    capture: true,
  });
  if (!/verified/i.test(signature)) throw new Error("apksigner did not report a verified debug signature.");

  const outputDir = join(projectRoot, "APK");
  await mkdir(outputDir, { recursive: true });
  const latestApk = join(outputDir, "FioForja-teste.apk");
  const versionedApk = join(outputDir, "FioForja-debug-v" + packageInfo[3] + ".apk");
  await copyFile(apkPath, latestApk);
  await copyFile(apkPath, versionedApk);

  const latestStat = await stat(latestApk);
  const checksum = await sha256(latestApk);
  const sizeMiB = (latestStat.size / (1024 * 1024)).toFixed(2);
  const deliveryDirs = deliveryDirectories(outputDir);
  const info = [
    "FioForja Android debug build",
    "Package: " + packageInfo[1],
    "Version: " + packageInfo[3] + " (code " + packageInfo[2] + ")",
    "Android: minSdk " + minSdk + ", targetSdk " + targetSdk,
    "Signature: debug (verified by apksigner)",
    "Git HEAD: " + (readGit(["rev-parse", "HEAD"]).trim() || "UNKNOWN"),
    "Uncommitted source changes: " + (readGit(["status", "--porcelain"]).trim() ? "YES" : "NO"),
    "Size: " + latestStat.size + " bytes (" + sizeMiB + " MiB)",
    "SHA-256: " + checksum,
    "APK: " + latestApk,
    "Versioned copy: " + versionedApk,
    "Delivery directories: " + deliveryDirs.join(" | "),
    "",
  ].join("\n");
  const installInstructions = [
    "FioForja — APK de teste",
    "",
    "1. Copie FioForja-teste.apk para o smartphone.",
    "2. Abra o arquivo e permita a instalacao de apps desta origem se o Android solicitar.",
    "3. Para atualizar, instale o APK por cima da versao existente. Use a mesma identidade do app e a mesma chave debug local.",
    "4. Nao desinstale nem limpe os dados do app se quiser preservar o save local.",
    "",
    "O progresso do APK fica separado do navegador do computador. Desinstalar o app ou limpar seus dados pode apagar esse progresso.",
    "Renderizador: na tela inicial, toque em Visual da lamina para alternar entre Classico e Weapon DNA experimental.",
    "",
  ].join("\n");
  await writeFile(join(outputDir, "BUILD-INFO.txt"), info, "utf8");
  await writeFile(join(outputDir, "COMO-INSTALAR.txt"), installInstructions, "utf8");

  const finalFiles = ["FioForja-teste.apk", "FioForja-debug-v" + packageInfo[3] + ".apk", "BUILD-INFO.txt", "COMO-INSTALAR.txt"];
  for (const destination of deliveryDirs) {
    if (destination === resolve(outputDir)) continue;
    await mkdir(destination, { recursive: true });
    for (const name of finalFiles) await copyFile(join(outputDir, name), join(destination, name));
    console.log("Artefatos finais exportados: " + destination);
  }

  console.log("APK validado: " + latestApk);
  console.log("Tamanho: " + latestStat.size + " bytes (" + sizeMiB + " MiB)");
  console.log("SHA-256: " + checksum);
  console.log("Versao: " + packageInfo[3] + " (codigo " + packageInfo[2] + ")");
  console.log("Android: minSdk " + minSdk + ", targetSdk " + targetSdk);
  console.log("Assinatura debug: verificada");
  console.log("Copia identificada: " + versionedApk);
}

main().catch((error) => {
  console.error("[android] APK build failed:", error);
  process.exitCode = 1;
});
