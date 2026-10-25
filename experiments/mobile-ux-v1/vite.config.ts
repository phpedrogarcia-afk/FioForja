import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: `${projectRoot}/public`,
  plugins: [react()],
  resolve: { alias: { "@": `${projectRoot}/src` } },
  server: { host: "127.0.0.1", port: 8951, strictPort: true, fs: { allow: [projectRoot] } },
  build: { outDir: ".build", emptyOutDir: true, copyPublicDir: false },
});
