import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/integration-smoke.yml",
  "web/index.html",
  "web/main.ts",
  "web/live-status.json",
  "scripts/refresh-live-status.mjs",
  "telegram-integration/telegram-integration.ts",
  "telegram-integration/webapp-adapter.ts",
  "web/chat-sync.ts"
];

const failures = [];
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const requireMatch = (file, pattern, description) => {
  const content = read(file);
  if (!pattern.test(content)) failures.push(`${file}: missing ${description}`);
};

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing required file: ${file}`);
}

if (failures.length === 0) {
  requireMatch(".github/workflows/ci.yml", /npm run verify:integration/, "integration verifier in CI");
  requireMatch(".github/workflows/pages.yml", /npm run verify:integration/, "integration verifier in Pages build");
  requireMatch(".github/workflows/pages.yml", /npm run refresh:live/, "LIVE refresh in release pipeline");
  requireMatch("package.json", /"refresh:live"/, "LIVE refresh command");
  requireMatch("scripts/refresh-live-status.mjs", /web\/live-status\.json/, "LIVE cache path");
  requireMatch("web/index.html", /telegram\.org\/js\/telegram-web-app\.js/, "Telegram WebApp SDK");
  requireMatch("web/index.html", /src="\.\/main\.ts"/, "Web application entrypoint");
  requireMatch("web/main.ts", /Telegram\?\.WebApp/, "Telegram WebApp detection");
  requireMatch("web/main.ts", /CHAT_BRIDGE_URL = "https:\/\/freezzzplatform-chat\.onrender\.com"/, "canonical CHAT bridge");
  requireMatch("web/main.ts", /loadLivePlaybackStatus\(\)/, "LIVE cache loader");
  requireMatch("web/main.ts", /GameRuntime/, "GAME runtime");
  requireMatch("telegram-integration/webapp-adapter.ts", /ready\(\);/, "Telegram ready handshake");
  requireMatch("telegram-integration/webapp-adapter.ts", /expand\(\);/, "Telegram expand handshake");
  requireMatch("web/chat-sync.ts", /\/api\/chat\/messages\?limit=/, "CHAT history endpoint");
  requireMatch("web/chat-sync.ts", /\/api\/chat\/events/, "CHAT SSE endpoint");
  requireMatch("web/chat-sync.ts", /method: "POST"/, "CHAT send endpoint");

  const live = JSON.parse(read("web/live-status.json"));
  if (!live || typeof live !== "object" || !("sources" in live)) {
    failures.push("web/live-status.json: invalid cache shape");
  }

  const index = read("web/index.html");
  const sdkIndex = index.indexOf("telegram.org/js/telegram-web-app.js");
  const appIndex = index.indexOf('./main.ts');
  if (sdkIndex === -1 || appIndex === -1 || sdkIndex > appIndex) {
    failures.push("web/index.html: Telegram SDK must load before the application module");
  }
}

if (failures.length) {
  console.error("INTEGRATION CONTRACT: FAILED");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}

console.log("INTEGRATION CONTRACT: PASS");
console.log("GitHub → CI → Pages → Web → Telegram/CHAT/LIVE/GAME links are structurally present.");
