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
import { GameContentRegistry, GameContentResolver, MemoryGameContentSource } from "../content-layer/content-layer";
import { GameRuntime } from "../game-runtime/game-runtime";
import { WebGamePlayer } from "../web-game-player/web-game-player";
import { GameLibraryProjection } from "../game-library/game-library";
import { registerWebDemoGame } from "../game-bootstrap/game-bootstrap";
import { TelegramIntegration } from "../telegram-integration/telegram-integration";
import { TelegramWebAppAdapter } from "../telegram-integration/webapp-adapter";
import { WebStorageAdapter } from "../storage/platform-storage";
import { RadioBrowserClient, RADIO_GENRES, type RadioBrowserStation } from "./radio-browser";
import { WebMidiController, midiNoteName } from "./midi-controller";
import { MIDI_ASSET_CATALOG, loadMidiAssetCollection, toggleMidiAssetCollection, type MidiAssetItem } from "./midi-asset-database";
import { MIDI_SOUND_PRESETS, MIDI_UI_SOUND_CATALOG, loadMidiPresetId, saveMidiPresetId, loadMidiUiSoundId, saveMidiUiSoundId } from "./midi-presets";
import { frameAsciiArt, generateAsciiText, type AsciiStyle } from "../ascii-generator/ascii-generator";
import "./styles.css";
import { TelegramChatSync, type PortalChatMessage } from "./chat-sync";

const shell = new PlatformShell();
const host = new PlatformHost({ id: "freezzz-web", name: "FREEzzz Web Host", version: "0.1.0", target: "web" }, shell);
const workspace = new PlatformWorkspace(host);
const chat = new ChatModule(), live = new LiveModule(), radio = new RadioModule(), library = new LibraryModule();
for (const module of [chat, live, radio, library]) { module.initialize({ ownerCoreId: "freezzz-web" }); module.start(); }

let liveElement: HTMLVideoElement | undefined;
installWebModuleAdapters(chat, live, radio, library, element => { liveElement = element; });
library.useStorage("web-library");

chat.addConversation({ id: "general", participants: [{ id: "telegram", displayName: "Telegram" }] });
live.registerChannel({ id: "demo-channel", name: "Demo Channel", streamIds: [] });
live.registerStream({ id: "demo-stream", channelId: "demo-channel", title: "Demo stream", source: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", protocol: "progressive", isLive: false });

const mount = (() => {
  const element = document.querySelector<HTMLDivElement>("#app");
  if (!element) throw new Error("Platform workspace mount point is missing.");
  return element;
})();

const contentSource = new MemoryGameContentSource();
const contentRegistry = new GameContentRegistry();
const gameCatalog = new GameCatalog();
registerWebDemoGame(gameCatalog, contentRegistry, contentSource);
const gamePlayer = new WebGamePlayer(gameCatalog, new GameRuntime({ content: new GameContentResolver(contentRegistry, contentSource) }));
const radioBrowser = new RadioBrowserClient();
let radioStations: readonly RadioBrowserStation[] = [];
let radioGenre = "pop";
let radioQuery = "";
let radioLoading = false;
let radioError = "";
let radioRequestId = 0;
let radioSelectedId = (() => {
  try { return localStorage.getItem("freezzz:radio:selected") ?? ""; } catch { return ""; }
})();
let radioPlaybackStatus: "idle" | "loading" | "playing" | "paused" | "stopped" | "failed" = "idle";
const midiController = new WebMidiController();
let midiOutputs: readonly { id: string; name: string; manufacturer?: string }[] = [];
let midiInputs: readonly { id: string; name: string; manufacturer?: string }[] = [];
let midiError = "";
let midiOctave = 4;
let midiActiveNotes = new Set<number>();
let midiPadBank = 0;
type LiveSourceKind = "twitch" | "youtube";
interface LiveSource {
  readonly id: string;
  readonly label: string;
  readonly kind: LiveSourceKind;
  readonly url: string;
  readonly channel?: string;
  readonly channelId?: string;
  readonly videoId?: string;
  readonly youtubeHandle?: string;
}
interface LiveCreator {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly categories: readonly string[];
  readonly sources: readonly LiveSource[];
  readonly custom?: boolean;
}

const liveCreators: readonly LiveCreator[] = [
  { id: "leb1ga", name: "Leb1ga", region: "🇺🇦 Украина", categories: ["Just Chatting"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/leb1ga", channel: "leb1ga" }
  ]},
  { id: "dendi", name: "Dendi", region: "🇺🇦 Украина", categories: ["Dota 2"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/dendi", channel: "dendi" }
  ]},
  { id: "rolex9", name: "Vitaliy Kushnyryk", region: "🇺🇦 Украина", categories: ["Rolex9"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/rolex9", channel: "rolex9" }
  ]},
  { id: "papaplatte", name: "Papaplatte", region: "🇩🇪 Германия", categories: ["Variety", "Minecraft"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/papaplatte", channel: "papaplatte" },
    { id: "youtube", label: "YouTube", kind: "youtube", url: "https://youtube.com/papaplatte", channel: "UCDmbhGe7-wC1a55l5ZYAZJw" }
  ]},
  { id: "montanablack88", name: "MontanaBlack88", region: "🇩🇪 Германия", categories: ["Variety"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/montanablack88", channel: "montanablack88" },
    { id: "youtube", label: "YouTube", kind: "youtube", url: "https://youtube.com/montanablack88", channel: "UCpAMOlA_0hFXopIxMq8ar0w" }
  ]},
  { id: "trymacs", name: "Trymacs", region: "🇩🇪 Германия", categories: ["Variety", "Gaming"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/trymacs", channel: "trymacs" },
    { id: "youtube", label: "YouTube", kind: "youtube", url: "https://youtube.com/Trymacs", channel: "UC6Gc4KQ1ueDnh8x7plaAD3w" }
  ]},
  { id: "smetanduck", name: "smetanduck", region: "🎮 Mobile Legends: Bang Bang", categories: ["Mobile Legends"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/smetanduck", channel: "smetanduck" },
    { id: "youtube", label: "YouTube", kind: "youtube", url: "https://youtube.com/@smetanaml" }
  ]},
  { id: "titamin1", name: "titamin1", region: "🎮 Mobile Legends: Bang Bang", categories: ["Mobile Legends"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/titamin1", channel: "titamin1" }
  ]},
  { id: "dunkelsch4tten", name: "Dunkelsch4tten", region: "🎮 Mobile Legends: Bang Bang", categories: ["Mobile Legends"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/dunkelsch4tten", channel: "dunkelsch4tten" }
  ]},
  { id: "buster", name: "Buster", region: "🎮 CS2", categories: ["CS2"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/buster", channel: "buster" }
  ]},
  { id: "marmok", name: "Marmok", region: "😂 Юмор", categories: ["YouTube", "Gaming"], sources: [
    { id: "youtube", label: "YouTube", kind: "youtube", url: "https://youtube.com/@Marmok", channel: "UCkxpiTIU50N3_dNt4WMMZyw" }
  ]},
  { id: "zubarefff", name: "Zubarefff (Зубарев)", region: "😂 Юмор", categories: ["Entertainment"], sources: [
    { id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/zubareff", channel: "zubareff" }
  ]}
] as const;

interface LivePopup { readonly id: string; readonly creatorId: string; readonly sourceId: string; }
interface LivePlaybackEntry {
  readonly online: boolean;
  readonly liveVideoId?: string;
  readonly fallbackVideoId?: string;
  readonly checkedAt?: string;
}
interface LivePlaybackStatusFile {
  readonly generatedAt?: string;
  readonly sources?: Readonly<Record<string, LivePlaybackEntry>>;
}
const MAX_LIVE_POPUPS = 4;
const LIVE_CUSTOM_STORAGE_KEY = "freezzz:live:custom-creators";
let customLiveCreators: LiveCreator[] = loadCustomLiveCreators();
let selectedLiveCreatorId = liveCreators[0].id;
let selectedLiveSourceId = liveCreators[0].sources[0].id;
let livePopups: LivePopup[] = [];
let livePlaybackStatus: LivePlaybackStatusFile = { sources: {} };

function allLiveCreators(): LiveCreator[] {
  return [...liveCreators, ...customLiveCreators];
}
function selectedLiveCreator(): LiveCreator {
  const creators = allLiveCreators();
  return creators.find(creator => creator.id === selectedLiveCreatorId) ?? creators[0];
}
function selectedLiveSource(): LiveSource {
  const creator = selectedLiveCreator();
  return creator.sources.find(source => source.id === selectedLiveSourceId) ?? creator.sources[0];
}
function liveSource(creatorId: string, sourceId: string): LiveSource | undefined {
  return allLiveCreators().find(creator => creator.id === creatorId)?.sources.find(source => source.id === sourceId);
}
function loadCustomLiveCreators(): LiveCreator[] {
  try {
    const raw = localStorage.getItem(LIVE_CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as LiveCreator;
      return typeof candidate.id === "string" && typeof candidate.name === "string" &&
        Array.isArray(candidate.sources) && candidate.sources.length > 0;
    }) as LiveCreator[];
  } catch {
    return [];
  }
}
function saveCustomLiveCreators(): void {
  try { localStorage.setItem(LIVE_CUSTOM_STORAGE_KEY, JSON.stringify(customLiveCreators)); } catch {}
}
function normalizeLiveUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed);
    if (candidate.protocol !== "https:") return undefined;
    return candidate.toString();
  } catch {
    return undefined;
  }
}
function parseCustomLiveCreator(rawUrl: string): LiveCreator | undefined {
  const normalized = normalizeLiveUrl(rawUrl);
  if (!normalized) return undefined;
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const id = "custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  if (host === "twitch.tv") {
    const login = parts[0]?.toLowerCase();
    if (!login || !/^[a-z0-9_]{3,30}$/.test(login)) return undefined;
    return {
      id, name: login, region: "CUSTOM · Twitch", categories: ["Twitch"], custom: true,
      sources: [{ id: "twitch", label: "Twitch", kind: "twitch", url: "https://twitch.tv/" + login, channel: login }]
    };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    let videoId: string | undefined;
    let channelId: string | undefined;
    let youtubeHandle: string | undefined;
    if (host === "youtu.be") videoId = parts[0];
    else if (url.searchParams.get("v")) videoId = url.searchParams.get("v") ?? undefined;
    else if (parts[0] === "live" || parts[0] === "shorts") videoId = parts[1];
    else if (parts[0] === "channel" && parts[1]?.startsWith("UC")) channelId = parts[1];
    else if (parts[0]?.startsWith("@")) youtubeHandle = parts[0].slice(1);
    else if (parts[0] && !["watch", "feed", "videos", "streams"].includes(parts[0])) youtubeHandle = parts[0];
    if (!videoId && !channelId && !youtubeHandle) return undefined;
    const source: LiveSource = {
      id: "youtube", label: "YouTube", kind: "youtube", url: normalized,
      ...(videoId ? { videoId } : {}),
      ...(channelId ? { channel: channelId } : {}),
      ...(youtubeHandle ? { youtubeHandle } : {})
    };
    return {
      id, name: youtubeHandle || channelId?.slice(0, 12) || "YouTube",
      region: "CUSTOM · YouTube", categories: ["YouTube"], custom: true, sources: [source]
    };
  }
  return undefined;
}
function removeCustomLiveCreator(creatorId: string): void {
  customLiveCreators = customLiveCreators.filter(creator => creator.id !== creatorId);
  livePopups = livePopups.filter(popup => popup.creatorId !== creatorId);
  if (selectedLiveCreatorId === creatorId) {
    const fallback = allLiveCreators()[0];
    selectedLiveCreatorId = fallback.id;
    selectedLiveSourceId = fallback.sources[0].id;
  }
  saveCustomLiveCreators();
  render();
}
function openLiveAddModal(): void {
  document.querySelector("#live-add-modal")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "live-add-modal";
  overlay.className = "live-add-modal";
  overlay.innerHTML =
    '<form class="live-add-dialog" id="live-add-form">' +
    '<div class="live-add-head"><div><span class="muted">LIVE / CUSTOM</span><h3>Добавить стримера</h3><p>Вставь ссылку Twitch или YouTube.</p></div><button id="live-add-close" class="live-add-close" type="button" aria-label="Закрыть">×</button></div>' +
    '<label class="live-add-label">Ссылка на канал или видео<input id="live-add-url" type="url" required autocomplete="off" placeholder="https://twitch.tv/... или https://youtube.com/..."></label>' +
    '<div id="live-add-error" class="live-add-error" role="alert"></div>' +
    '<div class="live-add-actions"><button id="live-add-cancel" type="button">Отмена</button><button type="submit" class="live-add-submit">Добавить</button></div>' +
    '</form>';
  document.body.append(overlay);
  const close = () => overlay.remove();
  overlay.querySelector("#live-add-close")?.addEventListener("click", close);
  overlay.querySelector("#live-add-cancel")?.addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.querySelector<HTMLFormElement>("#live-add-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const input = overlay.querySelector<HTMLInputElement>("#live-add-url");
    const error = overlay.querySelector<HTMLElement>("#live-add-error");
    const creator = parseCustomLiveCreator(input?.value ?? "");
    if (!creator) {
      if (error) error.textContent = "Нужна корректная HTTPS-ссылка Twitch или YouTube.";
      return;
    }
    const source = creator.sources[0];
    const duplicate = allLiveCreators().some(item => item.sources.some(existing =>
      existing.url === source.url || (source.channel && existing.kind === source.kind && existing.channel === source.channel)
    ));
    if (duplicate) {
      if (error) error.textContent = "Этот стример уже есть в каталоге.";
      return;
    }
    customLiveCreators = [...customLiveCreators, creator];
    saveCustomLiveCreators();
    selectedLiveCreatorId = creator.id;
    selectedLiveSourceId = creator.sources[0].id;
    close();
    render();
  });
  window.setTimeout(() => overlay.querySelector<HTMLInputElement>("#live-add-url")?.focus(), 0);
}
function liveStatusKey(creatorId: string, sourceId: string): string {
  return `${creatorId}:${sourceId}`;
}
function liveEmbedUrl(creatorId: string, source: LiveSource): string | undefined {
  const status = livePlaybackStatus.sources?.[liveStatusKey(creatorId, source.id)];
  if (source.kind === "youtube" && source.videoId) {
    return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(source.videoId) + "?" +
      new URLSearchParams({ autoplay: "0", rel: "0", playsinline: "1" }).toString();
  }
  if (source.kind === "youtube" && source.youtubeHandle) {
    return "https://www.youtube-nocookie.com/embed?" +
      new URLSearchParams({ listType: "user_uploads", list: source.youtubeHandle, autoplay: "0", rel: "0", playsinline: "1" }).toString();
  }
  if (status && !status.online && status.fallbackVideoId) {
    if (source.kind === "twitch") {
      const parent = window.location.hostname || "freezzgames.github.io";
      return `https://player.twitch.tv/?${new URLSearchParams({ video: `v${status.fallbackVideoId}`, parent, autoplay: "false", muted: "false" }).toString()}`;
    }
    if (source.kind === "youtube") {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(status.fallbackVideoId)}?${new URLSearchParams({ autoplay: "0", rel: "0", playsinline: "1" }).toString()}`;
    }
  }
  if (source.kind === "twitch" && source.channel) {
    const parent = window.location.hostname || "freezzgames.github.io";
    return `https://player.twitch.tv/?${new URLSearchParams({ channel: source.channel, parent, autoplay: "false", muted: "false" }).toString()}`;
  }
  if (source.kind === "youtube" && source.channel) {
    if (status?.online && status.liveVideoId) {
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(status.liveVideoId)}?${new URLSearchParams({ autoplay: "0", rel: "0", playsinline: "1" }).toString()}`;
    }
    return `https://www.youtube-nocookie.com/embed/live_stream?${new URLSearchParams({ channel: source.channel, autoplay: "0", rel: "0", playsinline: "1" }).toString()}`;
  }
  return undefined;
}
async function loadLivePlaybackStatus(): Promise<void> {
  try {
    const response = await fetch(`./live-status.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as LivePlaybackStatusFile;
    if (!data || typeof data !== "object") return;
    livePlaybackStatus = data;
    if (workspace.getState().view === "live") render();
  } catch {
    // LIVE keeps direct provider playback when the status cache is unavailable.
  }
}
void loadLivePlaybackStatus();
function openLivePopup(creatorId: string, sourceId: string): void {
  const source = liveSource(creatorId, sourceId);
  if (!source) return;
  const existing = livePopups.find(popup => popup.creatorId === creatorId && popup.sourceId === sourceId);
  if (existing) return;
  if (livePopups.length >= MAX_LIVE_POPUPS) livePopups = livePopups.slice(1);
  livePopups = [...livePopups, { id: `${creatorId}-${sourceId}-${Date.now()}`, creatorId, sourceId }];
  selectedLiveCreatorId = creatorId;
  selectedLiveSourceId = sourceId;
  render();
}
function closeLivePopup(popupId: string): void {
  livePopups = livePopups.filter(popup => popup.id !== popupId);
  render();
}

const gameLibrary = new GameLibraryProjection(gameCatalog, library);
const platformStorageAdapter = new WebStorageAdapter("freezzz:platform:");
const platformSession = new PlatformSessionPersistence(platformStorageAdapter);
const telegramIntegration = new TelegramIntegration();
const CHAT_BRIDGE_URL = "https://freezzzplatform-chat.onrender.com";
const chatSync = new TelegramChatSync(CHAT_BRIDGE_URL);
let chatSyncStatus: "offline" | "connecting" | "online" | "error" = "offline";
let chatSyncError = "";
const chatSenderNames = new Map<string, string>();

function ingestTelegramChatMessage(message: PortalChatMessage): void {
  chatSenderNames.set(message.senderId, message.username || message.senderName);
  if (chat.store.listMessages("general").some(item => item.id === message.id)) return;
  chat.receive({ id: message.id, conversationId: "general", senderId: message.senderId, text: message.text, timestamp: message.timestamp });
}

function rebuildTelegramChat(messages: readonly PortalChatMessage[]): void {
  chat.store.removeConversation("general");
  chat.addConversation({ id: "general", participants: [{ id: "telegram", displayName: "Telegram" }] });
  chatSenderNames.clear();
  for (const message of messages) ingestTelegramChatMessage(message);
}

async function initializeChatSync(): Promise<void> {
  chatSync.onStatus(status => { chatSyncStatus = status; if (status !== "error") chatSyncError = ""; if (workspace.getState().view === "chat") render(); });
  chatSync.onMessage(message => { try { ingestTelegramChatMessage(message); } catch (error) { chatSyncError = error instanceof Error ? error.message : String(error); } if (workspace.getState().view === "chat") render(); });
  chatSync.onMessageUpdated(message => { void chatSync.loadHistory(100).then(rebuildTelegramChat).then(() => { if (workspace.getState().view === "chat") render(); }).catch(error => { chatSyncError = error instanceof Error ? error.message : String(error); if (workspace.getState().view === "chat") render(); }); });
  try {
    const history = await chatSync.loadHistory(100);
    if (history.length) rebuildTelegramChat(history);
    else if (chat.store.listMessages("general").length === 0) chat.receive({ id: "welcome", conversationId: "general", senderId: "system", text: "CHAT bridge is waiting for Telegram.", timestamp: Date.now() });
    chatSync.connect();
    const config = await chatSync.getConfig();
    if (!config.telegramConfigured) chatSyncError = "Telegram bot token is not configured on the CHAT bridge.";
  } catch (error) {
    chatSyncError = error instanceof Error ? error.message : String(error);
    chatSyncStatus = "error";
    chatSync.connect();
  }
}

void initializeChatSync();

const telegramBridge = (globalThis as typeof globalThis & { Telegram?: { WebApp?: { initData?: string; initDataUnsafe?: Readonly<{ user?: { id: number; username?: string; first_name?: string; last_name?: string } }>; ready(): void; expand(): void; close(): void; sendData?(data: string): void } } }).Telegram?.WebApp;
if (telegramBridge) {
  telegramIntegration.initialize({ id: "webapp", username: "freezzz", version: "1.0.0" });
  telegramIntegration.clients.register(new TelegramWebAppAdapter(telegramBridge));
  telegramIntegration.selectClient("telegram-webapp");
  telegramIntegration.start();
}

gameLibrary.sync();

const views: readonly PlatformWorkspaceView[] = ["home", "library", "chat", "live", "radio", "system"];
const labels: Record<PlatformWorkspaceView, string> = { home: "Home", library: "Game Test", chat: "Chat", live: "Live", radio: "Radio", system: "System" };

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
  document.body.dataset.platformView = state.view;
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
    return `<section class="hero panel"><span class="muted">Production workspace</span><h2>Everything in one runtime.</h2><p>Games, library, CHAT, LIVE and RADIO use independent adapters while the workspace preserves the active session.</p><div class="metrics"><span>Runtime<strong>${dStatus()}</strong></span><span>Modules<strong>4</strong></span><span>Game<strong>${gameState.gameId ? escapeHtml(gameState.gameId) : "None"}</strong></span></div><div class="quick-actions"><button data-quick="library" type="button">Open Game Test</button><button data-quick="chat" type="button">Open Chat</button><button data-quick="live" type="button">Open Live</button><button data-quick="radio" type="button">Open Radio</button></div></section>`;
  }
  if (current === "system") return `<section class="panel"><span class="muted">System</span><h2>Runtime health</h2><div class="status-list"><div>HOST <strong>${host.getStatus()}</strong></div><div>CHAT <strong>${chat.status}</strong></div><div>LIVE <strong>${live.status}</strong></div><div>RADIO <strong>${radio.status}</strong></div><div>LIBRARY <strong>${library.status}</strong></div><div>SESSION <strong>${platformSession.load() ? "RESTORED" : "NEW"}</strong></div></div></section>`;
  if (current === "library") {
    const games = gameCatalog.list();
    const state = gamePlayer.getState();
    return `<section class="panel game-test"><span class="muted">WEB GAME TEST</span><h2>Gameplay test</h2><p>Этот экран предназначен для быстрой проверки игрового runtime в браузере. Android APK для каждой итерации больше не нужен.</p><div class="game-test-layout"><div class="game-screen-wrap"><canvas id="game-canvas" width="256" height="240" aria-label="Game display"></canvas><div class="game-status"><span>Status: ${state.status}</span><span>Frames: ${state.frame}</span><span>Game: ${state.gameId ? escapeHtml(state.gameId) : "None"}</span></div></div><div class="game-test-controls"><h3>Games</h3>${games.length ? games.map(game => `<button class="game-select ${state.gameId === game.id ? "active" : ""}" data-game-launch="${escapeHtml(game.id)}" type="button"><strong>${escapeHtml(game.name)}</strong><span>${escapeHtml(game.emulatorId)} · ${escapeHtml(game.version)}</span></button>`).join("") : `<div class="game-empty">Игры пока не зарегистрированы в веб-каталоге.</div>`}<div class="actions"><button id="game-save" type="button">Save</button><button id="game-pause" type="button">Pause</button><button id="game-resume" type="button">Resume</button><button id="game-exit" type="button">Exit</button></div></div></div></section>`;
  }
  if (current === "chat") {
    const statusLabel = chatSyncStatus === "online" ? "TELEGRAM LIVE" : chatSyncStatus === "connecting" ? "CONNECTING" : chatSyncStatus === "error" ? "BRIDGE ERROR" : "OFFLINE";
    const messages = chat.store.listMessages("general");
    return `<section class="panel chat-portal"><div class="chat-heading"><div><span class="muted">CHAT</span><h2>Telegram Chat</h2><p>Portal interface · synchronized with the Telegram group</p></div><div class="chat-connection ${chatSyncStatus}"><span></span>${statusLabel}</div></div>${chatSyncError ? `<div class="chat-error">${escapeHtml(chatSyncError)}<button id="chat-reconnect" type="button">Reconnect</button></div>` : ""}<div class="chat-log" id="chat-log">${messages.map(message => `<div class="chat-message ${message.senderId === "system" ? "system" : ""}"><strong>${escapeHtml(chatSenderNames.get(message.senderId) || message.senderId)}</strong><span>${escapeHtml(message.text)}</span><time>${new Date(message.timestamp).toLocaleTimeString()}</time></div>`).join("")}</div><form id="chat-form" class="inline-form"><input id="chat-input" maxlength="4096" autocomplete="off" required placeholder="Write a message to Telegram"><button type="submit">Send</button></form></section>`;
  }
  if (current === "live") {
    const selected = selectedLiveCreator();
    const source = selectedLiveSource();
    const liveCatalog = allLiveCreators();
    return `<section class="panel live-portal">
      <div class="live-title-row"><div><span class="muted">LIVE</span><h2>Стримы</h2><p>Открывай источники во всплывающих окнах. Одновременно до 4 плееров.</p></div><div class="live-title-actions"><span class="live-count">${livePopups.length}/${MAX_LIVE_POPUPS} players</span><button id="live-add-streamer" class="live-add-button" type="button">＋ Добавить стримера</button></div></div>
      <div class="live-feature">
        <div class="live-feature-head">
          <div class="live-creator-title"><div class="live-avatar">${escapeHtml(selected.name.slice(0, 2).toUpperCase())}</div><div><strong>${escapeHtml(selected.name)}</strong><span>${escapeHtml(selected.region)} · ${escapeHtml(selected.categories.join(" · "))}</span></div></div>
          <button class="live-open" data-live-open-creator="${escapeHtml(selected.id)}" data-live-open-source="${escapeHtml(source.id)}" type="button">Открыть ${escapeHtml(source.label)}</button>
        </div>
        <div class="live-source-tabs">${selected.sources.map(item => `<button class="live-source" data-live-open-creator="${escapeHtml(selected.id)}" data-live-open-source="${escapeHtml(item.id)}" type="button">${escapeHtml(item.label)} · ▶</button>`).join("")}</div>
      </div>
      <div class="live-catalog-head"><div><strong>Все блогеры</strong><span>Системные + добавленные тобой. Нажми источник, чтобы открыть окно.</span></div><span>${liveCatalog.length} всего</span></div>
      <div class="live-catalog">${liveCatalog.map(creator => `<button class="live-card ${creator.id === selected.id ? "active" : ""}" data-live-creator="${escapeHtml(creator.id)}" type="button"><span class="live-avatar small">${escapeHtml(creator.name.slice(0, 2).toUpperCase())}</span><span class="live-card-main"><strong>${escapeHtml(creator.name)}</strong><span>${escapeHtml(creator.region)}</span><small>${escapeHtml(creator.categories.join(" · "))}</small></span><span class="live-source-count">${creator.custom ? "CUSTOM" : creator.sources.length + " src"}</span>${creator.custom ? '<span class="live-card-remove" data-live-remove="' + escapeHtml(creator.id) + '" role="button" tabindex="0" aria-label="Удалить ' + escapeHtml(creator.name) + '">×</span>' : ""}</button>`).join("")}</div>
      ${livePopups.length ? `<div class="live-popup-layer" aria-label="LIVE players">
        <div class="live-popup-grid">${livePopups.map(popup => {
          const creator = allLiveCreators().find(item => item.id === popup.creatorId);
          const popupSource = liveSource(popup.creatorId, popup.sourceId);
          if (!creator || !popupSource) return "";
          const embedUrl = liveEmbedUrl(popup.creatorId, popupSource);
          return `<article class="live-popup" data-live-popup="${escapeHtml(popup.id)}">
            <div class="live-popup-head"><strong>${escapeHtml(creator.name)} · ${escapeHtml(popupSource.label)}</strong><button class="live-popup-close" data-live-popup-close="${escapeHtml(popup.id)}" type="button" aria-label="Закрыть плеер">×</button></div>
            <div class="live-popup-video">${embedUrl
              ? `<iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(creator.name)} — ${escapeHtml(popupSource.label)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
              : `<div class="live-popup-fallback"><strong>Встроенный плеер недоступен для этого источника.</strong><a href="${escapeHtml(popupSource.url)}" target="_blank" rel="noopener noreferrer">Открыть ${escapeHtml(popupSource.label)} напрямую</a></div>`}</div>
          </article>`;
        }).join("")}</div>
      </div>` : ""}
    </section>`;
  }
  const selectedStation = radioStations.find(station => station.stationuuid === radioSelectedId) ?? radioStations[0];
  const selectedIndex = selectedStation ? radioStations.findIndex(station => station.stationuuid === selectedStation.stationuuid) : -1;
  const carouselCards = selectedStation && selectedIndex >= 0 && radioStations.length
    ? Array.from({ length: Math.min(3, radioStations.length) }, (_, offset) => {
        const half = Math.floor(Math.min(3, radioStations.length) / 2);
        const index = (selectedIndex + offset - half + radioStations.length) % radioStations.length;
        return radioStations[index];
      })
    : [];
  return `<section class="panel radio-portal">
    <div class="radio-heading">
      <div><span class="muted">FREEzzz RADIO</span><h2>Internet Radio</h2><p>Live station browser with the active station centered. Swipe or select a neighboring card.</p></div>
      <button id="open-midi" class="midi-open-button" type="button">♫ MIDI Controller</button>
    </div>
    <div class="radio-feature">
      <div class="radio-carousel" id="radio-carousel" aria-label="Radio station carousel">
        <div class="radio-carousel-track" id="radio-carousel-track">          ${carouselCards.map(station => {
            const active = station.stationuuid === selectedStation?.stationuuid;
            const logo = station.favicon?.trim() || "";
            return `<button class="radio-carousel-card ${active ? "active" : ""}" data-radio-carousel-id="${escapeHtml(station.stationuuid)}" type="button" title="${escapeHtml(station.name)}" aria-label="${escapeHtml(station.name)}">
              ${logo
                ? `<img class="radio-card-logo" src="${escapeHtml(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
                : `<span class="radio-card-logo-fallback" aria-hidden="true">◉</span>`}
            </button>`;
          }).join("")}
        </div>
      </div>
      <div class="radio-now-playing">
        <div>
          <span class="muted">NOW PLAYING</span>
          <h3>${selectedStation ? escapeHtml(selectedStation.name) : "Choose a station"}</h3>
          <p>${selectedStation
            ? [
                selectedStation.country || "International",
                selectedStation.tags || "radio",
                selectedStation.language || "",
                selectedStation.codec ? `${selectedStation.codec} · ${selectedStation.bitrate || 0} kbps` : ""
              ].filter(Boolean).map(escapeHtml).join(" · ")
            : "Load a genre or search above."}</p>
        </div>
        <div class="radio-player-controls">
          <button id="radio-play" type="button" ${selectedStation ? "" : "disabled"}>${radioPlaybackStatus === "playing" ? "Playing" : "Play"}</button>
          <button id="radio-pause" type="button" ${radioPlaybackStatus === "playing" ? "" : "disabled"}>Pause</button>
          <button id="radio-stop" type="button" ${radioPlaybackStatus !== "idle" && radioPlaybackStatus !== "stopped" ? "" : "disabled"}>Stop</button>
        </div>
      </div>
    </div>
    <div id="radio-audio-host" class="radio-audio-host"></div>
    <div class="radio-toolbar"><form id="radio-search-form" class="inline-form"><input id="radio-search-input" value="${escapeHtml(radioQuery)}" maxlength="80" autocomplete="off" placeholder="Search station"><button type="submit">Search</button></form></div>
    <div class="radio-genres">${RADIO_GENRES.map(genre=>`<button class="${radioGenre===genre?"active":""}" data-radio-genre="${genre}" type="button">${escapeHtml(genre)}</button>`).join("")}</div>
    ${radioError ? `<div class="radio-status">${escapeHtml(radioError)}</div>` : ""}
  </section>`;
}

function bind(current: PlatformWorkspaceView): void {
  document.querySelectorAll<HTMLButtonElement>("[data-quick]").forEach(button => button.addEventListener("click", () => { workspace.navigate(button.dataset.quick as PlatformWorkspaceView); persistSession(); render(); }));
  if (current === "home") bindAsciiGenerator();
  if (current === "library") {
    document.querySelectorAll<HTMLButtonElement>("[data-game-launch]").forEach(button => button.addEventListener("click", () => { try { gamePlayer.select(button.dataset.gameLaunch!); gamePlayer.launch(); persistSession(); startGameLoop(); render(); } catch (error) { workspace.reportError(error); render(); } }));
    document.querySelector("#game-save")?.addEventListener("click", () => { try { gamePlayer.save(); persistSession(); } catch (error) { workspace.reportError(error); } render(); });
    document.querySelector("#game-pause")?.addEventListener("click", () => { try { gamePlayer.pause(); } catch (error) { workspace.reportError(error); } render(); });
    document.querySelector("#game-resume")?.addEventListener("click", () => { try { gamePlayer.resume(); startGameLoop(); } catch (error) { workspace.reportError(error); } render(); });
    document.querySelector("#game-exit")?.addEventListener("click", () => { gamePlayer.exit(); persistSession(); render(); });
    drawGameFrame();
  }
  if (current === "chat") {
    document.querySelector("#chat-reconnect")?.addEventListener("click", () => { chatSync.disconnect(); chatSync.connect(); });
    document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>("#chat-input");
      const text = input?.value.trim() || "";
      if (!text) return;
      const button = document.querySelector<HTMLButtonElement>("#chat-form button");
      if (button) button.disabled = true;
      try {
        const message = await chatSync.send(text);
        if (message) ingestTelegramChatMessage(message);
        if (input) input.value = "";
        persistSession();
        render();
      } catch (error) {
        chatSyncError = error instanceof Error ? error.message : String(error);
        chatSyncStatus = "error";
        render();
      } finally {
        const currentButton = document.querySelector<HTMLButtonElement>("#chat-form button");
        if (currentButton) currentButton.disabled = false;
      }
    });
    const log = document.querySelector<HTMLElement>("#chat-log");
    if (log) log.scrollTop = log.scrollHeight;
  }
  if (current === "live") {
    document.querySelectorAll<HTMLButtonElement>("[data-live-creator]").forEach(button => button.addEventListener("click", () => {
      selectedLiveCreatorId = button.dataset.liveCreator ?? liveCreators[0].id;
      selectedLiveSourceId = selectedLiveCreator().sources[0].id;
      render();
    }));
    document.querySelectorAll<HTMLButtonElement>("[data-live-open-source]").forEach(button => button.addEventListener("click", () => {
      const creatorId = button.dataset.liveOpenCreator ?? selectedLiveCreatorId;
      const sourceId = button.dataset.liveOpenSource ?? selectedLiveSource().id;
      openLivePopup(creatorId, sourceId);
    }));
    document.querySelectorAll<HTMLButtonElement>("[data-live-popup-close]").forEach(button => button.addEventListener("click", () => {
      closeLivePopup(button.dataset.livePopupClose ?? "");
    }));
    document.querySelector("#live-add-streamer")?.addEventListener("click", openLiveAddModal);
    document.querySelectorAll<HTMLElement>("[data-live-remove]").forEach(element => {
      const remove = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        removeCustomLiveCreator(element.dataset.liveRemove ?? "");
      };
      element.addEventListener("click", remove);
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") remove(event);
      });
    });
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
    document.querySelectorAll<HTMLButtonElement>("[data-radio-station], [data-radio-carousel-id]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.radioStation ?? button.dataset.radioCarouselId ?? "";
      if (id) {
        radioSelectedId = id;
        try { localStorage.setItem("freezzz:radio:selected", id); } catch {}
        render();
      }
    }));
    document.querySelector("#radio-play")?.addEventListener("click", () => {
      void playRadioStation(radioSelectedId).catch(error => {
        radioPlaybackStatus = "failed";
        radioError = error instanceof Error ? error.message : String(error);
        render();
      });
    });
    document.querySelector("#radio-pause")?.addEventListener("click", () => {
      try { radio.pause(); radioPlaybackStatus = "paused"; render(); } catch (error) { workspace.reportError(error); render(); }
    });
    document.querySelector("#radio-stop")?.addEventListener("click", () => {
      try { radio.stopPlayback(); radioPlaybackStatus = "stopped"; render(); } catch (error) { workspace.reportError(error); render(); }
    });
    const carousel = document.querySelector<HTMLElement>("#radio-carousel-track");
    let swipeStartX = 0;
    carousel?.addEventListener("pointerdown", event => { swipeStartX = event.clientX; });
    carousel?.addEventListener("pointerup", event => {
      const dx = event.clientX - swipeStartX;
      if (Math.abs(dx) < 45 || radioStations.length < 2) return;
      const currentIndex = Math.max(0, radioStations.findIndex(station => station.stationuuid === radioSelectedId));
      const nextIndex = (currentIndex + (dx < 0 ? 1 : -1) + radioStations.length) % radioStations.length;
      radioSelectedId = radioStations[nextIndex].stationuuid;
      try { localStorage.setItem("freezzz:radio:selected", radioSelectedId); } catch {}
      render();
    });
    document.querySelector("#open-midi")?.addEventListener("click", () => { renderMidiOverlay(); });
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
    if (radioSelectedId && stations.some(station => station.stationuuid === radioSelectedId)) {
      // Keep the saved station when it is still present in the current result.
    } else if (stations[0]) {
      radioSelectedId = stations[0].stationuuid;
      try { localStorage.setItem("freezzz:radio:selected", radioSelectedId); } catch {}
    }
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

function renderMidiOverlay(): void {
  document.querySelector("#midi-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "midi-overlay";
  overlay.className = "midi-overlay";

  const notes = Array.from({ length: 25 }, (_, index) => (midiOctave + 1) * 12 + index);
  const pads = Array.from({ length: 16 }, (_, index) => index);
  const controls = [
    { cc: 7, label: "MASTER", short: "VOL" },
    { cc: 21, label: "FILTER", short: "CUT" },
    { cc: 22, label: "RESONANCE", short: "RES" },
    { cc: 23, label: "ATTACK", short: "ATK" },
    { cc: 24, label: "RELEASE", short: "REL" },
    { cc: 10, label: "PAN", short: "PAN" },
    { cc: 1, label: "MODULATION", short: "MOD" },
    { cc: 11, label: "EXPRESSION", short: "EXP" }
  ];

  const savedPreset = loadMidiPresetId();
  if (midiController.getPreset().id !== savedPreset) midiController.setPreset(savedPreset);
  const audioState = midiController.getAudioState();
  const outputName = midiController.getOutput()?.name ?? "Virtual synth";
  const inputName = midiController.getInput()?.name ?? "No MIDI input";
  const soundLabel = midiController.isAudioEnabled() ? "SOUND ON" : "ENABLE SOUND";
  const statusText = midiError
    ? midiError
    : midiController.isAudioEnabled()
      ? `Virtual synth ready · ${escapeHtml(outputName)}`
      : audioState === "unavailable"
        ? "Web Audio is unavailable in this browser."
        : "Tap ENABLE SOUND once, then play the controller.";

  overlay.innerHTML = `
    <div class="midi-controller">
      <header class="midi-header">
        <div class="midi-brand">
          <span class="midi-kicker">FREEzzz AUDIO LAB / MIDI-01</span>
          <h2>MIDI Controller</h2>
          <p>Standalone virtual instrument · MIDI hardware is optional</p>
        </div>
        <div class="midi-header-actions">
          <span class="midi-live-led ${midiController.isAudioEnabled() ? "on" : ""}"></span>
          <button id="midi-close" type="button" aria-label="Close MIDI controller">CLOSE</button>
        </div>
      </header>

      <section class="midi-console">
        <div class="midi-transport">
          <button id="midi-enable-audio" class="midi-primary" type="button">${soundLabel}</button>
          <button id="midi-connect" type="button">CONNECT MIDI</button>
          <label>MIDI OUT
            <select id="midi-output">
              <option value="">Virtual synth</option>
              ${midiOutputs.map(output => `<option value="${escapeHtml(output.id)}" ${midiController.getOutput()?.id === output.id ? "selected" : ""}>${escapeHtml(output.name)}</option>`).join("")}
            </select>
          </label>
          <label>MIDI IN
            <select id="midi-input">
              <option value="">No input</option>
              ${midiInputs.map(input => `<option value="${escapeHtml(input.id)}" ${midiController.getInput()?.id === input.id ? "selected" : ""}>${escapeHtml(input.name)}</option>`).join("")}
            </select>
          </label>
          <div class="midi-octave">
            <button id="midi-octave-down" type="button">−</button>
            <strong>OCT ${midiOctave}</strong>
            <button id="midi-octave-up" type="button">+</button>
          </div>
        </div>
        <div class="midi-statusbar">
          <span class="midi-status-led ${midiController.isAudioEnabled() ? "on" : ""}"></span>
          <span>${statusText}</span>
          <span class="midi-status-right">CH ${midiController.getChannel() + 1} · ${inputName}</span>
        </div>
      </section>

      <section class="midi-main-grid">
        <section class="midi-drum-machine">
          <div class="midi-section-head">
            <div><span>PERFORMANCE</span><strong>16 PAD BANK</strong></div>
            <div class="midi-bank-switch"><button id="midi-bank-down" type="button">‹</button><b>BANK ${midiPadBank + 1}</b><button id="midi-bank-up" type="button">›</button></div>
          </div>
          <div class="midi-pads">
            ${pads.map(index => {
              const note = 36 + midiPadBank * 16 + index;
              return `<button class="midi-pad" data-midi-pad="${index}" data-midi-pad-note="${note}" type="button">
                <span class="midi-pad-number">${String(index + 1).padStart(2, "0")}</span>
                <span class="midi-pad-light"></span>
                <strong>${["KICK","SNARE","HAT","CLAP","TOM","RIM","PERC","FX"][index % 8]}</strong>
                <small>NOTE ${note}</small>
              </button>`;
            }).join("")}
          </div>
        </section>

        <section class="midi-control-deck">
          <div class="midi-section-head"><div><span>MACRO CONTROL</span><strong>CC PERFORMANCE</strong></div><span class="midi-value-label">0 — 127</span></div>
          <div class="midi-knob-grid">
            ${controls.map(control => {
              const value = midiController.getCC(control.cc);
              return `<label class="midi-knob">
                <span class="midi-knob-ring"><input data-midi-cc="${control.cc}" aria-label="${control.label}" type="range" min="0" max="127" value="${value}"></span>
                <strong>${control.short}</strong>
                <output>${value}</output>
                <small>CC ${control.cc}</small>
              </label>`;
            }).join("")}
          </div>
        </section>
      </section>

      <section class="midi-preset-panel">
<div class="midi-section-head"><div><span>INSTRUMENT</span><strong>SOUND PRESET</strong></div>
<label class="midi-preset-select"><select id="midi-preset" aria-label="Sound preset">${MIDI_SOUND_PRESETS.map(p => `<option value="${p.id}" ${p.id === loadMidiPresetId() ? "selected" : ""}>${escapeHtml(p.name)} · ${escapeHtml(p.description)}</option>`).join("")}</select></label></div>
<div class="midi-ui-sound-row"><span>UI SOUND SET</span><select id="midi-ui-sound" aria-label="UI sound set">${MIDI_UI_SOUND_CATALOG.map(p => `<option value="${p.id}" ${p.id === loadMidiUiSoundId() ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}</select>
<button data-midi-ui-sound-test="click" type="button">CLICK</button><button data-midi-ui-sound-test="select" type="button">SELECT</button><button data-midi-ui-sound-test="confirm" type="button">CONFIRM</button><button data-midi-ui-sound-test="back" type="button">BACK</button><button data-midi-ui-sound-test="error" type="button">ERROR</button><button data-midi-ui-sound-test="pad" type="button">PAD</button></div>
</section>
<section class="midi-keyboard">
        <div class="midi-section-head">
          <div><span>PERFORMANCE KEYS</span><strong>25 KEY MINI KEYBOARD</strong></div>
          <span class="midi-range-label">${midiNoteName(notes[0])} — ${midiNoteName(notes[notes.length - 1])}</span>
        </div>
        <div class="midi-keys-wrap">
          <div class="midi-keys">
            ${notes.map(note => {
              const black = [1, 3, 6, 8, 10].includes(note % 12);
              const whiteNotes = notes.filter(item => ![1, 3, 6, 8, 10].includes(item % 12));
              const whiteIndex = whiteNotes.filter(item => item < note).length;
              const whiteWidth = 100 / whiteNotes.length;
              const left = black ? whiteIndex * whiteWidth - whiteWidth * 0.325 : whiteIndex * whiteWidth;
              const width = black ? whiteWidth * 0.65 : whiteWidth;
              return `<button class="midi-key ${black ? "black" : "white"} ${midiActiveNotes.has(note) ? "active" : ""}" data-midi-note="${note}" style="left:${left}%;width:${width}%" type="button"><span>${midiNoteName(note)}</span></button>`;
            }).join("")}
          </div>
        </div>
      </section>

      <section class="midi-asset-library">
        <div class="midi-section-head">
          <div><span>LOCAL LIBRARY</span><strong>CC0 CONTROLLER ASSETS</strong></div>
          <small>Stored locally in this browser</small>
        </div>
        <div class="midi-assets">
          ${MIDI_ASSET_CATALOG.map((asset: MidiAssetItem) => {
            const saved = loadMidiAssetCollection().includes(asset.id);
            return `<button class="midi-asset ${saved ? "active" : ""}" data-midi-asset="${escapeHtml(asset.id)}" type="button">
              <strong>${escapeHtml(asset.name)}</strong>
              <span>${escapeHtml(asset.category)} · ${escapeHtml(asset.source)}</span>
              <small>${saved ? "COLLECTED" : "ADD TO LIBRARY"}</small>
            </button>`;
          }).join("")}
        </div>
      </section>
    </div>`;

  document.body.append(overlay);

  const close = () => {
    midiController.setInputNoteHandler(null);
    overlay.remove();
  };
  document.querySelector("#midi-close")?.addEventListener("click", close);

  midiController.setInputNoteHandler((note, _velocity, pressed) => {
    if (pressed) midiActiveNotes.add(note);
    else midiActiveNotes.delete(note);
    const key = overlay.querySelector<HTMLButtonElement>(`[data-midi-note="${note}"]`);
    key?.classList.toggle("active", pressed);
  });

  document.querySelector("#midi-enable-audio")?.addEventListener("click", async () => {
    midiError = "";
    if (!(await midiController.enableAudio())) midiError = "Audio could not be activated in this browser.";
    renderMidiOverlay();
  });

  document.querySelector("#midi-connect")?.addEventListener("click", async () => {
    try {
      midiError = "";
      const devices = await midiController.connect();
      midiOutputs = devices.outputs;
      midiInputs = devices.inputs;
      renderMidiOverlay();
    } catch (error) {
      midiError = error instanceof Error ? error.message : String(error);
      renderMidiOverlay();
    }
  });

  document.querySelector<HTMLSelectElement>("#midi-output")?.addEventListener("change", event => {
    const id = (event.target as HTMLSelectElement).value;
    try {
      midiController.setOutput(id);
      midiError = "";
    } catch (error) {
      midiError = error instanceof Error ? error.message : String(error);
    }
    renderMidiOverlay();
  });

  document.querySelector<HTMLSelectElement>("#midi-input")?.addEventListener("change", event => {
    const id = (event.target as HTMLSelectElement).value;
    try {
      midiController.setInput(id);
      midiError = "";
    } catch (error) {
      midiError = error instanceof Error ? error.message : String(error);
    }
    renderMidiOverlay();
  });

  document.querySelector("#midi-octave-down")?.addEventListener("click", () => {
    midiOctave = Math.max(1, midiOctave - 1);
    midiController.setOctave(midiOctave);
    renderMidiOverlay();
  });

  document.querySelector("#midi-octave-up")?.addEventListener("click", () => {
    midiOctave = Math.min(7, midiOctave + 1);
    midiController.setOctave(midiOctave);
    renderMidiOverlay();
  });

  document.querySelector("#midi-bank-down")?.addEventListener("click", () => {
    midiPadBank = Math.max(0, midiPadBank - 1);
    renderMidiOverlay();
  });

  document.querySelector("#midi-bank-up")?.addEventListener("click", () => {
    midiPadBank = Math.min(7, midiPadBank + 1);
    renderMidiOverlay();
  });

  document.querySelectorAll<HTMLInputElement>("[data-midi-cc]").forEach(input => {
    input.addEventListener("input", event => {
      const target = event.target as HTMLInputElement;
      const cc = Number(target.dataset.midiCc);
      midiController.controlChange(cc, Number(target.value));
      const output = target.parentElement?.querySelector("output");
      if (output) output.value = target.value;
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-midi-pad]").forEach(button => {
    const note = Number(button.dataset.midiPadNote);
    const press = (event: PointerEvent) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      midiController.triggerPad(note, 110);
      midiController.playUiSound("pad");
      button.classList.add("active");
      window.setTimeout(() => button.classList.remove("active"), 100);
    };
    button.addEventListener("pointerdown", press);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-midi-note]").forEach(button => {
    const note = Number(button.dataset.midiNote);
    const press = (event: PointerEvent) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      midiActiveNotes.add(note);
      midiController.noteOn(note, 100);
      button.classList.add("active");
    };
    const release = (event: PointerEvent) => {
      if (!midiActiveNotes.delete(note)) return;
      midiController.noteOff(note);
      button.classList.remove("active");
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-midi-asset]").forEach(button => {
    button.addEventListener("click", () => {
      toggleMidiAssetCollection(button.dataset.midiAsset ?? "");
      renderMidiOverlay();
    });
  });
}

function bindAsciiGenerator(): void {
  const hero = document.querySelector(".hero.panel");
  if (!hero || document.querySelector("#ascii-generator")) return;
  const section = document.createElement("section");
  section.id = "ascii-generator";
  section.className = "panel ascii-generator";
  section.innerHTML = '<div><span class="muted">ASCII ART LAB</span><h2>ASCII Generator</h2><p>Локальный генератор текстового ASCII-арта. Он работает независимо от CHAT, LIVE, RADIO и GAME.</p></div><div class="ascii-controls"><label>Text<input id="ascii-text" maxlength="40" value="FREEzzz" autocomplete="off"></label><label>Style<select id="ascii-style"><option value="block">Block</option><option value="slim">Slim</option><option value="dots">Dots</option><option value="box">Box</option></select></label><button id="ascii-generate" type="button">Generate</button><button id="ascii-copy" type="button">Copy</button></div><pre id="ascii-output" class="ascii-output" aria-live="polite"></pre>';
  hero.insertAdjacentElement("afterend", section);
  const textInput = section.querySelector<HTMLInputElement>("#ascii-text");
  const styleInput = section.querySelector<HTMLSelectElement>("#ascii-style");
  const output = section.querySelector<HTMLPreElement>("#ascii-output");
  if (!textInput || !styleInput || !output) return;
  const update = () => {
    const art = generateAsciiText(textInput.value, styleInput.value as AsciiStyle);
    output.textContent = art ? frameAsciiArt(art, "FREEzzz ASCII") : "Введите текст для генерации.";
  };
  section.querySelector("#ascii-generate")?.addEventListener("click", update);
  textInput.addEventListener("input", update);
  styleInput.addEventListener("change", update);
  section.querySelector("#ascii-copy")?.addEventListener("click", async () => {
    if (!output.textContent || output.textContent === "Введите текст для генерации.") return;
    try {
      await navigator.clipboard.writeText(output.textContent);
      const button = section.querySelector<HTMLButtonElement>("#ascii-copy");
      if (button) { button.textContent = "Copied"; window.setTimeout(() => { button.textContent = "Copy"; }, 900); }
    } catch {
      // Clipboard is optional; generation remains fully local.
    }
  });
  update();
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
  try { localStorage.setItem("freezzz:radio:selected", radioSelectedId); } catch {}
  radioPlaybackStatus = "loading";
  radio.load(`rb-${station.stationuuid}`, "web");
  radio.play();
  radioPlaybackStatus = "playing";
  void radioBrowser.registerClick(station.stationuuid);
}

function drawGameFrame(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas"); if (!canvas) return;
  const context = canvas.getContext("2d"); if (!context) return;
  const frame = gamePlayer.getVideoFrame(); if (frame.length !== 256 * 240) return;
  const image = context.createImageData(256, 240);
  for (let i = 0; i < frame.length; i += 1) { const value = frame[i]; const pixel = i * 4; image.data[pixel] = value; image.data[pixel + 1] = value; image.data[pixel + 2] = value; image.data[pixel + 3] = 255; }
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
