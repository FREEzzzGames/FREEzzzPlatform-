import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  base: "./",
  root: "web",
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    // LIVE cache is runtime data fetched as ./live-status.json, not a TS import.
    // Copy the generated cache into the Pages artifact after Vite has cleaned dist.
    rollupOptions: {}
  },
  plugins: [{
    name: "copy-live-status-to-pages",
    closeBundle() {
      const source = path.resolve("web/live-status.json");
      const destination = path.resolve("dist/live-status.json");
      if (!fs.existsSync(source)) throw new Error("web/live-status.json is missing");
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }
  }]
});
