import { PlatformHost } from "../platform-host/platform-host";
import { PlatformShell } from "../platform-shell/platform-shell";
import { PlatformWorkspace, type PlatformWorkspaceView } from "../platform-workspace/platform-workspace";
import { PlatformSessionPersistence } from "../platform-session/platform-session";
import { ChatModule } from "../chat-module/chat-module";
import { LiveModule } from "../live-module/live-module";
import { RadioModule } from "../radio-module/radio-module";
import { LibraryModule } from "../library-module/library-module";
import { installWebModuleAdapters } from "../module-adapters/module-adapters";
import { GameCatalog } from "../game-catalog/game-catalog";
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource, sha256 } from "../content-layer/content-layer";
import { GameRuntime } from "../game-runtime/game-runtime";
import { WebGamePlayer } from "../web-game-player/web-game-player";
import { GameLibraryProjection } from "../game-library/game-library";
import { TelegramIntegration } from "../telegram-integration/telegram-integration";
import { TelegramWebAppAdapter } from "../telegram-integration/webapp-adapter";
import { WebStorageAdapter } from "../storage/platform-storage";
import { RadioBrowserClient, RADIO_GENRES, type RadioBrowserStation } from "./radio-browser";
import "./styles.css";

const shell = new PlatformShell();
const host = new PlatformHost({ id: "freezzz-web", name: "FREEzzz Web Host", version: "0.1.0", target: "web" }, shell);
const workspace = new PlatformWorkspace(host);
const chat = new ChatModule(), live = new LiveModule(), radio = new RadioModule(), library = new LibraryModule();
for (const module of [chat, live, radio, library]) { module.initialize({ ownerCoreId: "freezzz-web" }); module.start(); }

let liveElement: HTMLVideoElement | undefined;
installWebModuleAdapters(chat, live, radio, library, element => { liveElement = element; });
library.useStorage("web-library");

chat.addConversation({ id: "general", participants: [{ id: "user", displayName: "User" }, { id: "system", displayName: "System" }] });
if (chat.store.listMessages("general").length === 0) {
  chat.receive({ id: "welcome", conversationId: "general", senderId: "system", text: "CHAT adapter is online.", timestamp: Date.now() });
}
library.add({ id: "platform-demo", title: "Platform Demo", type: "game", version: "1.0.0", source: "content://demo" });

live.registerChannel({ id: "demo-channel", name: "Demo Channel", streamIds: [] });
live.registerStream({ id: "demo-stream", channelId: "demo-channel", title: "Demo stream", source: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", protocol: "progressive", isLive: false });


const mount = (() => {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) throw new Error("Platform workspace mount point is missing.");
  return element;
})();

const gameBytes = new Uint8Array([0xea, 0xea, 0x4c, 0x00, 0x80]);
const contentSource = new MemoryGameContentSource();
const contentRegistry = new GameContentRegistry();
contentSource.register({ id: "platform-demo-rom", gameId: "platform-demo-game", kind: "rom", version: "1.0.0", size: gameBytes.length, checksum: sha256(gameBytes) }, gameBytes);
contentRegistry.register({ gameId: "platform-demo-game", version: "1.0.0", emulatorId: "nes", entryContentId: "platform-demo-rom", requiredContent: [] });
const gameCatalog = new GameCatalog();
gameCatalog.register({ id: "platform-demo-game", name: "Platform Demo", version: "1.0.0", emulatorId: "nes", content: contentRegistry.get("platform-demo-game")! });
const gamePlayer = new WebGamePlayer(gameCatalog, new GameRuntime({ content: new GameContentResolver(contentRegistry, contentSource) }));
const radioBrowser = new RadioBrowserClient();
let radioStations: readonly RadioBrowserStation[] = [];
let radioGenre = "pop";
let radioQuery = "";
let radioLoading = false;
let radioError = "";
let radioRequestId = 0;
let radioSelectedId = "";
const liveChannels = [
  {
    id: "woodskiy-ded",
    name: "Вудский Дед",
    url: "https://www.youtube.com/channel/UCKgQPQj9J3BUgTVci1up75A",
    embedUrl: "https://www.youtube-nocookie.com/embed/tGMJ59g1Yd0",
    platform: "YouTube"
  },
  {
    id: "noobfromua",
    name: "NoobFromUA",
    url: "https://www.youtube.com/channel/UCfsOfLvadg89Bx8Sv_6WERg",
    platform: "YouTube"
  },
  {
    id: "smetana",
    name: "СМЕТАНА",
    url: "https://www.youtube.com/@smetanaml",
    embedUrl: "https://www.youtube-nocookie.com/embed/C9j4lS2uO8w",
    platform: "YouTube"
  }
] as const;
let selectedLiveChannelId = liveChannels[0].id;
const gameLibrary = new GameLibraryProjection(gameCatalog, library);
const platformStorageAdapter = new WebStorageAdapter("freezzz:platform:");
const platformSession = new PlatformSessionPersistence(platformStorageAdapter);
const telegramIntegration = new TelegramIntegration();

const telegramBridge = (globalThis as typeof globalThis & { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: Readonly<{ user?: { id: number; username?: string; first_name?: string; last_name?: string } }>; ready(): void; expand(): void; close(): void; sendData?(data: string): void } } }).Telegram?.WebApp;
if (telegramBridge) {
  telegramIntegration.initialize({ id: "webapp", username: "freezzz", version: "1.0.0" });
  telegramIntegration.clients.register(new TelegramWebAppAdapter(telegramBridge));
  telegramIntegration.selectClient("telegram-webapp");
  telegramIntegration.start();
}

gameLibrary.sync();

const views: readonly PlatformWorkspaceView[] = ["home", "library", "chat", "live", "radio", "system"];
const labels: Record<PlatformWorkspaceView, string> = { home: "Home", library: "Library", chat: "Chat", live: "Live", radio: "Radio", system: "System" };

function persistSession(): void {
  platformSession.save({ workspace: workspace.snapshot(), selectedGameId: gamePlayer.getState().gameId });
}

const previous = platformSession.load();
try {
  workspace.start();
  if (previous) {
    platformSession.restore(workspace, previous);
    if (previous.selectedGameId && gameCatalog.get(previous.selectedGameId)) gamePlayer.select(previous.selectedGameId);
  }
} catch (error) {
  workspace.reportError(error);
}

function render(): void {
  const state = workspace.getState();
  const diagnostics = host.getDiagnostics();
  mount.innerHTML = `<main class="workspace"><header class="topbar"><div><span class="eyebrow">FREEzzz</span><h1>Platform</h1></div><span class="state state-${state.status}">${state.status.toUpperCase()}</span></header><nav class="nav">${views.map(viewName => `<button class="${state.view === viewName ? "active" : ""}" data-view="${viewName}" type="button">${labels[viewName]}</button>`).join("")}</nav>${state.lastError ? `<div class="error" role="alert"><span>${escapeHtml(state.lastError)}</span><button id="clear-error" type="button">Dismiss</button></div>` : ""}${view(state.view)}<footer><span class="muted">Target ${diagnostics.manifest.target} · ${host.getStatus()}</span><div class="footer-actions"><button id="persist" type="button">Save session</button><button id="restart" type="button">Restart</button></div></footer></main>`;
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(button => button.onclick = () => { workspace.navigate(button.dataset.view as PlatformWorkspaceView); persistSession(); render(); });
  document.querySelector("#clear-error")?.addEventListener("click", () => { workspace.clearError(); render(); });
  document.querySelector("#persist")?.addEventListener("click", () => { persistSession(); render(); });
  document.querySelector("#restart")?.addEventListener("click", () => { try { if (host.getStatus() === "ready") host.stop(); workspace.start(); } catch (error) { workspace.reportError(error); } render(); });
  bind(state.view);
}

function view(current: PlatformWorkspaceView): string {
  if (current === "home") {
    const gameState = gamePlayer.getState();
    return `<section class="hero panel"><span class="muted">Production workspace</span><h2>Everything in one runtime.</h2><p>Games, library, CHAT, LIVE and RADIO use independent adapters while the workspace preserves the active session.</p><div class="metrics"><span>Runtime<strong>${dStatus()}</strong></span><span>Modules<strong>4</strong></span><span>Game<strong>${gameState.gameId ? escapeHtml(gameState.gameId) : "None"}</strong></span></div><div class="quick-actions"><button data-quick="library" type="button">Open Library</button><button data-quick="chat" type="button">Open Chat</button><button data-quick="live" type="button">Open Live</button><button data-quick="radio" type="button">Open Radio</button></div></section>`;
  }
  if (current === "system") return `<section class="panel"><span class="muted">System</span><h2>Runtime health</h2><div class="status-list"><div>HOST <strong>${host.getStatus()}</strong></div><div>CHAT <strong>${chat.status}</strong></div><div>LIVE <strong>${live.status}</strong></div><div>RADIO <strong>${radio.status}</strong></div><div>LIBRARY <strong>${library.status}</strong></div><div>SESSION <strong>${platformSession.load() ? "RESTORED" : "NEW"}</strong></div></div></section>`;
  if (current === "library") return `<section class="panel"><span class="muted">Library</span><h2>Games</h2><div class="list">${gameCatalog.list().map(game => `<div class="row"><div><strong>${escapeHtml(game.name)}</strong><span>${escapeHtml(game.emulatorId)} · ${escapeHtml(game.version)}</span></div><button data-game-launch="${escapeHtml(game.id)}" type="button">Launch</button></div>`).join("")}</div><div class="game-status"><span>Status: ${gamePlayer.getState().status}</span><span>Frames: ${gamePlayer.getState().frame}</span><div class="actions"><button id="game-save" type="button">Save</button><button id="game-pause" type="button">Pause</button><button id="game-resume" type="button">Resume</button><button id="game-exit" type="button">Exit</button></div></div><canvas id="game-canvas" width="256" height="240" aria-label="Game display"></canvas></section>`;
  if (current === "chat") return `<section class="panel"><span class="muted">CHAT</span><h2>General</h2><div class="chat-log">${chat.store.listMessages("general").map(message => `<div class="chat-message"><strong>${escapeHtml(message.senderId)}</strong><span>${escapeHtml(message.text)}</span><time>${new Date(message.timestamp).toLocaleTimeString()}</time></div>`).join("")}</div><form id="chat-form" class="inline-form"><input id="chat-input" maxlength="500" autocomplete="off" required placeholder="Message"><button type="submit">Send</button></form></section>`;
  if (current === "live") {
    const selected = liveChannels.find(channel => channel.id === selectedLiveChannelId) ?? liveChannels[0];
    return `<section class="panel live-portal">
      <span class="muted">LIVE</span>
      <h2>Стримы</h2>
      <div class="live-feature">
        <div class="live-feature-head">
          <div><strong>${escapeHtml(selected.name)}</strong><span>${escapeHtml(selected.platform)} · ссылка из списка LIVE</span></div>
          <a class="live-open" href="${escapeHtml(selected.url)}" target="_blank" rel="noopener noreferrer">Открыть канал</a>
        </div>
        <div class="live-player-shell">
          ${selected.embedUrl
            ? `<iframe src="${escapeHtml(selected.embedUrl)}" title="${escapeHtml(selected.name)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
            : `<div class="live-placeholder"><strong>Прямой встроенный плеер недоступен для этого канала</strong><span>Открой канал по кнопке выше.</span></div>`}
        </div>
      </div>
      <div class="live-carousel">
        ${liveChannels.map(channel => `<button class="live-card ${channel.id === selected.id ? "active" : ""}" data-live-channel="${channel.id}" type="button">
          <strong>${escapeHtml(channel.name)}</strong>
          <span>${escapeHtml(channel.platform)}</span>
        </button>`).join("")}
      </div>
      <div class="live-native-player">
        <span class="muted">Native LIVE adapter test</span>
        <div id="live-player"></div>
        <div class="actions"><button id="live-load" type="button">Load test</button><button id="live-play" type="button">Play</button><button id="live-pause" type="button">Pause</button><button id="live-stop" type="button">Stop</button></div>
      </div>
    </section>`;
  }
  return `<section class="panel radio-portal"><span class="muted">PUBLIC RADIO</span><h2>Internet Radio</h2><p>Public internet stations from Radio Browser. Choose a genre, search a station, then press Play.</p><div id="radio-audio-host" class="radio-audio-host"></div><div class="radio-toolbar"><form id="radio-search-form" class="inline-form"><input id="radio-search-input" value="${escapeHtml(radioQuery)}" maxlength="80" autocomplete="off" placeholder="Search station"><button type="submit">Search</button></form></div><div class="radio-genres">${RADIO_GENRES.map(genre=>`<button class="${radioGenre===genre?"active":""}" data-radio-genre="${genre}" type="button">${escapeHtml(genre)}</button>`).join("")}</div><div class="radio-status">${radioLoading?"Loading stations…":radioError?escapeHtml(radioError):radioStations.length+" stations"}</div><div class="list radio-stations">${radioStations.map(station=>`<div class="row radio-station"><div><strong>${escapeHtml(station.name)}</strong><span>${escapeHtml(station.country||"International")} · ${escapeHtml(station.codec||"stream")} · ${station.bitrate||0} kbps</span></div><button data-radio-station="${escapeHtml(station.stationuuid)}" type="button">${radioSelectedId===station.stationuuid?"Playing":"Play"}</button></div>`).join("")}</div><div class="muted">Catalog: Radio Browser · HTTPS streams only</div></section>`;
}

function bind(current: PlatformWorkspaceView): void {
  document.querySelectorAll<HTMLButtonElement>("[data-quick]").forEach(button => button.addEventListener("click", () => { workspace.navigate(button.dataset.quick as PlatformWorkspaceView); persistSession(); render(); }));
  if (current === "library") {
    document.querySelectorAll<HTMLButtonElement>("[data-game-launch]").forEach(button => button.addEventListener("click", () => { try { gamePlayer.select(button.dataset.gameLaunch!); gamePlayer.launch(); persistSession(); startGameLoop(); render(); } catch (error) { workspace.reportError(error); render(); } }));
    document.querySelector("#game-save")?.addEventListener("click", () => { try { gamePlayer.save(); persistSession(); } catch (error) { workspace.reportError(error); } render(); });
    document.querySelector("#game-pause")?.addEventListener("click", () => { try { gamePlayer.pause(); } catch (error) { workspace.reportError(error); } render(); });
    document.querySelector("#game-resume")?.addEventListener("click", () => { try { gamePlayer.resume(); startGameLoop(); } catch (error) { workspace.reportError(error); } render(); });
    document.querySelector("#game-exit")?.addEventListener("click", () => { gamePlayer.exit(); persistSession(); render(); });
    drawGameFrame();
  }
  if (current === "chat") document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit", event => { event.preventDefault(); const input = document.querySelector<HTMLInputElement>("#chat-input"); if (!input?.value.trim()) return; chat.receive({ id: `m-${Date.now()}`, conversationId: "general", senderId: "user", text: input.value.trim(), timestamp: Date.now() }); persistSession(); render(); });
  if (current === "live") {
    document.querySelectorAll<HTMLButtonElement>("[data-live-channel]").forEach(button => button.addEventListener("click", () => {
      selectedLiveChannelId = button.dataset.liveChannel ?? liveChannels[0].id;
      render();
    }));
    document.querySelector("#live-load")?.addEventListener("click", () => { try { live.load("demo-stream", "web"); render(); } catch (error) { workspace.reportError(error); render(); } });
    document.querySelector("#live-play")?.addEventListener("click", () => { try { live.play(); } catch (error) { workspace.reportError(error); render(); } });
    document.querySelector("#live-pause")?.addEventListener("click", () => { try { live.pause(); } catch (error) { workspace.reportError(error); render(); } });
    document.querySelector("#live-stop")?.addEventListener("click", () => { try { live.stopPlayback(); } catch (error) { workspace.reportError(error); render(); } });
    const target = document.querySelector("#live-player"); if (target && liveElement && liveElement.parentElement !== target) target.append(liveElement);
  }
  if (current === "radio") {
    document.querySelector<HTMLFormElement>("#radio-search-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>("#radio-search-input");
      radioQuery = input?.value.trim() ?? "";
      void loadRadioStations();
    });
    document.querySelectorAll<HTMLButtonElement>("[data-radio-genre]").forEach(button => button.addEventListener("click", () => {
      radioGenre = button.dataset.radioGenre ?? "pop";
      radioQuery = "";
      void loadRadioStations();
    }));
    document.querySelectorAll<HTMLButtonElement>("[data-radio-station]").forEach(button => button.addEventListener("click", () => {
      void playRadioStation(button.dataset.radioStation ?? "");
    }));
    if (!radioStations.length && !radioLoading && !radioError) void loadRadioStations();
  }
}

async function loadRadioStations(): Promise<void> {
  const requestId = ++radioRequestId;
  radioLoading = true;
  radioError = "";
  render();
  try {
    const stations = await radioBrowser.searchStations({ genre: radioGenre, query: radioQuery, limit: 30 });
    if (requestId !== radioRequestId) return;
    radioStations = stations;
  } catch (error) {
    if (requestId !== radioRequestId) return;
    radioStations = [];
    radioError = error instanceof Error ? error.message : String(error);
  } finally {
    if (requestId === radioRequestId) {
      radioLoading = false;
      render();
    }
  }
}

async function playRadioStation(stationId: string): Promise<void> {
  const station = radioStations.find(item => item.stationuuid === stationId);
  if (!station) return;
  try {
    const stream = station.url_resolved || station.url;
    radio.registerStation({
      id: `rb-${station.stationuuid}`,
      name: station.name,
      stream,
      format: station.codec ? `audio/${station.codec.toLowerCase()}` : "audio/mpeg",
      metadata: {
        country: station.country,
        language: station.language,
        tags: station.tags,
        homepage: station.homepage
      }
    });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("already exists"))) throw error;
  }
  radioSelectedId = station.stationuuid;
  radio.load(`rb-${station.stationuuid}`, "web");
  radio.play();
  void radioBrowser.registerClick(station.stationuuid);
}

function drawGameFrame(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas"); if (!canvas) return;
  const context = canvas.getContext("2d"); if (!context) return;
  const frame = gamePlayer.getVideoFrame(); if (frame.length !== 256 * 240) return;
  const image = context.createImageData(256, 240);
  for (let i = 0; i < frame.length; i++) { const value = frame[i]; const pixel = i * 4; image.data[pixel] = value; image.data[pixel + 1] = value; image.data[pixel + 2] = value; image.data[pixel + 3] = 255; }
  context.putImageData(image, 0, 0);
}

let gameLoop: number | undefined;
function startGameLoop(): void {
  if (gameLoop !== undefined) return;
  const tick = () => {
    if (gamePlayer.getState().status === "playing") {
      try { gamePlayer.frame(); drawGameFrame(); } catch (error) { workspace.reportError(error); }
      gameLoop = requestAnimationFrame(tick);
    } else gameLoop = undefined;
  };
  gameLoop = requestAnimationFrame(tick);
}

function dStatus(): string { return host.getDiagnostics().shellStatus; }
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

globalThis.addEventListener("beforeunload", persistSession);
render();
