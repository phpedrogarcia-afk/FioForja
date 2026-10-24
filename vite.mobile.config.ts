import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, "mobile"),
  base: "/",
  publicDir: false,
  resolve: {
    alias: { "@": resolve(projectRoot, "src") },
    tsconfigPaths: true,
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(projectRoot, "dist-mobile"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(projectRoot, "mobile/index.html"),
    },
  },
});
