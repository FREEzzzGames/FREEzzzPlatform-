import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
  build: { outDir: "../dist", emptyOutDir: true }
});
