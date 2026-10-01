import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("release integration contract", () => {
  it("keeps the canonical repository workflows", () => {
    expect(read(".github/workflows/ci.yml")).toContain('branches: ["**"]');
    expect(read(".github/workflows/pages.yml")).toContain('branches: ["main"]');
    expect(read(".github/workflows/pages.yml")).toContain("npm run refresh:live");
    expect(read("scripts/refresh-live-status.mjs")).toContain("web/live-status.json");
  });

  it("keeps Telegram SDK before the application entrypoint", () => {
    const index = read("web/index.html");
    expect(index.indexOf("telegram.org/js/telegram-web-app.js")).toBeGreaterThanOrEqual(0);
    expect(index.indexOf("telegram.org/js/telegram-web-app.js")).toBeLessThan(index.indexOf("./main.ts"));
  });

  it("keeps the Web → Telegram handshake", () => {
    const source = read("web/main.ts");
    expect(source).toContain("Telegram?.WebApp");
    expect(read("telegram-integration/webapp-adapter.ts")).toContain("this.bridge.ready()");
    expect(read("telegram-integration/webapp-adapter.ts")).toContain("this.bridge.expand()");
  });

  it("keeps independent CHAT and LIVE routes", () => {
    const main = read("web/main.ts");
    expect(main).toContain('const CHAT_BRIDGE_URL = "https://freezzzplatform-chat.onrender.com"');
    expect(main).toContain("loadLivePlaybackStatus()");
    expect(read("web/chat-sync.ts")).toContain("/api/chat/events");
    expect(read("web/chat-sync.ts")).toContain("/api/chat/messages");
  });

  it("keeps the GAME runtime attached to the Web shell", () => {
    const main = read("web/main.ts");
    expect(main).toContain("GameCatalog");
    expect(main).toContain("GameRuntime");
    expect(main).toContain("WebGamePlayer");
  });
});
