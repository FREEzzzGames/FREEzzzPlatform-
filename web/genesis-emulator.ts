export type GenesisPlayerStatus = "idle" | "loading" | "running" | "stopped" | "error";

export interface GenesisPlayerState {
  readonly status: GenesisPlayerStatus;
  readonly fileName: string | null;
  readonly error: string | null;
}

type GenesisStateListener = (state: GenesisPlayerState) => void;

const CDN_DATA = "https://cdn.emulatorjs.org/stable/data/";

function gameIdFromName(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export class GenesisWebPlayer {
  private iframe: HTMLIFrameElement | null = null;
  private pageUrl: string | null = null;
  private romUrl: string | null = null;
  private state: GenesisPlayerState = Object.freeze({ status: "idle", fileName: null, error: null });
  private listeners = new Set<GenesisStateListener>();

  getState(): GenesisPlayerState { return this.state; }

  onStateChange(listener: GenesisStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: GenesisPlayerState): void {
    this.state = Object.freeze(state);
    for (const listener of this.listeners) listener(this.state);
  }

  sendInput(key: string, action: "keydown" | "keyup"): void {
    if (!this.iframe?.contentWindow) return;
    this.iframe.contentWindow.postMessage({ type: "freezzz-gamepad-key", key, action }, "*");
  }

  async mount(container: HTMLElement, file: File, language = "ru-RU"): Promise<void> {
    this.stop();
    if (!file.name.toLowerCase().match(/\.(md|gen|bin|smd|mdx)$/)) {
      throw new Error("Unsupported Sega Mega Drive ROM format. Use .md, .gen, .bin, .smd or .mdx.");
    }
    this.setState({ status: "loading", fileName: file.name, error: null });
    try {
      this.romUrl = URL.createObjectURL(file);
      const gameId = gameIdFromName(file.name);
      const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>html,body,#game{margin:0;width:100%;height:100%;background:#000;overflow:hidden}body{display:flex;align-items:center;justify-content:center}</style></head>
<body><div id="game" aria-label="Sega Mega Drive emulator"></div>
<script>
window.EJS_player="#game";
window.EJS_core="segaMD";
window.EJS_pathtodata=__CDN_DATA__;
window.EJS_gameUrl=__ROM_URL__;
window.EJS_gameName=__GAME_NAME__;
window.EJS_gameID=__GAME_ID__;
window.EJS_language=__LANGUAGE__;
window.EJS_startOnLoaded=true;
window.EJS_fullscreenOnLoaded=false;
window.EJS_disableAutoLang=true;
window.EJS_browserMode="mobile";
window.EJS_color="#1aa7ff";
window.EJS_onGameStart=function(){parent.postMessage({type:"freezzz-genesis-ready"},"*");};
window.EJS_onExit=function(){parent.postMessage({type:"freezzz-genesis-exit"},"*");};
window.addEventListener("message",function(event){
  if(!event.data || event.data.type!=="freezzz-gamepad-key") return;
  var type=event.data.action==="keyup" ? "keyup" : "keydown";
  var key=event.data.key;
  window.dispatchEvent(new KeyboardEvent(type,{key:key,code:key,keyCode:({ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,Enter:13,ShiftLeft:16,KeyA:65,KeyS:83,KeyD:68,KeyQ:81,KeyW:87,KeyE:69,KeyF:70}[key]||0),which:({ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,Enter:13,ShiftLeft:16,KeyA:65,KeyS:83,KeyD:68,KeyQ:81,KeyW:87,KeyE:69}[key]||0),bubbles:true}));
});
</script><script src="__CDN_SCRIPT__loader.js"></script></body></html>`;
      const page = html
        .replace("__CDN_DATA__", JSON.stringify(CDN_DATA))
        .replace("__CDN_SCRIPT__", CDN_DATA)
        .replace("__ROM_URL__", JSON.stringify(this.romUrl))
        .replace("__GAME_NAME__", JSON.stringify(file.name))
        .replace("__GAME_ID__", String(gameId))
        .replace("__LANGUAGE__", JSON.stringify(language));
      this.pageUrl = URL.createObjectURL(new Blob([page], { type: "text/html" }));
      const iframe = document.createElement("iframe");
      iframe.title = `Sega Mega Drive — ${file.name}`;
      iframe.allow = "autoplay; fullscreen; gamepad";
      iframe.referrerPolicy = "no-referrer";
      iframe.style.cssText = "display:block;width:100%;height:100%;min-height:480px;border:0;background:#000";
      iframe.src = this.pageUrl;
      container.replaceChildren(iframe);
      this.iframe = iframe;
      iframe.addEventListener("load", () => {
        if (this.state.status === "loading") this.setState({ status: "running", fileName: file.name, error: null });
      }, { once: true });
      window.addEventListener("message", this.handleMessage);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      this.stop();
      this.setState({ status: "error", fileName: file.name, error: message });
      throw new Error(message);
    }
  }

  private handleMessage = (event: MessageEvent): void => {
    if (!event.data || (event.data.type !== "freezzz-genesis-ready" && event.data.type !== "freezzz-genesis-exit")) return;
    if (event.data.type === "freezzz-genesis-ready" && this.state.fileName) {
      this.setState({ status: "running", fileName: this.state.fileName, error: null });
    }
    if (event.data.type === "freezzz-genesis-exit" && this.state.fileName) {
      this.setState({ status: "stopped", fileName: this.state.fileName, error: null });
    }
  };

  stop(): void {
    window.removeEventListener("message", this.handleMessage);
    this.iframe?.remove();
    this.iframe = null;
    if (this.pageUrl) URL.revokeObjectURL(this.pageUrl);
    if (this.romUrl) URL.revokeObjectURL(this.romUrl);
    this.pageUrl = null;
    this.romUrl = null;
    if (this.state.status !== "idle") this.setState({ status: "stopped", fileName: this.state.fileName, error: null });
  }
}
