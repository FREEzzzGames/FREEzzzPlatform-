import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const requiredFiles = [
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
  "web/index.html",
  "web/main.ts",
  "web/styles.css",
  "ascii-generator/ascii-generator.ts",
  "ascii-generator/index.ts",
  "android/app/build.gradle",
  "android/app/src/main/AndroidManifest.xml",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/release-check.yml"
];

describe("Repository integrity", () => {
  it("keeps all release-critical files present", () => {
    for (const file of requiredFiles) expect(existsSync(resolve(root, file)), file).toBe(true);
  });

  it("keeps the web entry point on the Vite source tree", () => {
    const html = readFileSync(resolve(root, "web/index.html"), "utf8");
    expect(html).toContain('id="app"');
    expect(html).toContain('src="./main.ts"');
  });

  it("keeps every workspace route represented by the web shell", () => {
    const main = readFileSync(resolve(root, "web/main.ts"), "utf8");
    for (const route of ["home", "library", "chat", "live", "radio", "system"]) {
      expect(main).toContain('"' + route + '"');
    }
    expect(main).toContain('data-view');
    expect(main).toContain('data-quick="library"');
    expect(main).toContain('data-quick="chat"');
    expect(main).toContain('data-quick="live"');
    expect(main).toContain('data-quick="radio"');
  });

  it("keeps the ASCII generator isolated from platform navigation", () => {
    const main = readFileSync(resolve(root, "web/main.ts"), "utf8");
    expect(main).toContain('from "../ascii-generator/ascii-generator"');
    expect(main).toContain("bindAsciiGenerator");
    expect(main).not.toContain('workspace.navigate("ascii"');
  });

  it("keeps obsolete duplicate Android build entry points absent", () => {
    expect(existsSync(resolve(root, "android/build.gradle.kts"))).toBe(false);
    expect(existsSync(resolve(root, "android/settings.gradle.kts"))).toBe(false);
    expect(existsSync(resolve(root, "android/app/build.gradle.kts"))).toBe(false);
    expect(existsSync(resolve(root, "android/app/src/main/java/com/freezzz/platform/MainActivity.java"))).toBe(false);
  });
});
