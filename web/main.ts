import { PlatformHost } from "../platform-host/platform-host";
import { PlatformShell } from "../platform-shell/platform-shell";
import { PlatformWorkspace, type PlatformWorkspaceView } from "../platform-workspace/platform-workspace";
import "./styles.css";

const shell = new PlatformShell();
const host = new PlatformHost({ id: "freezzz-web", name: "FREEzzz Web Host", version: "0.1.0", target: "web" }, shell);
const workspace = new PlatformWorkspace(host);
const mount = (() => { const element = document.querySelector<HTMLDivElement>("#app"); if (!element) throw new Error("Platform workspace mount point is missing."); return element; })();
const views: readonly PlatformWorkspaceView[] = ["home", "library", "chat", "live", "radio", "system"];
const labels: Record<PlatformWorkspaceView, string> = { home: "Home", library: "Library", chat: "Chat", live: "Live", radio: "Radio", system: "System" };

function render(): void {
  const state = workspace.getState();
  const diagnostics = host.getDiagnostics();
  const content = state.view === "home"
    ? `<div class="panel"><span class="muted">Platform</span><h2>FREEzzz Platform</h2><p>Independent services, one host boundary.</p><div class="metrics"><span>Host<strong>${diagnostics.status}</strong></span><span>Runtime<strong>${diagnostics.shellStatus}</strong></span><span>Cores<strong>${diagnostics.registeredCores}</strong></span></div></div>`
    : state.view === "system"
      ? `<div class="panel"><span class="muted">System</span><h2>Platform status</h2><p>Host: ${diagnostics.status}</p><p>Registered cores: ${diagnostics.registeredCores}</p><p>Started cores: ${diagnostics.startedCores}</p></div>`
      : `<div class="panel"><span class="muted">${labels[state.view]}</span><h2>${labels[state.view]}</h2><p>This workspace is ready for the independent module adapter.</p></div>`;
  mount.innerHTML = `<main class="workspace"><header class="topbar"><div><span class="eyebrow">FREEzzz</span><h1>Platform</h1></div><span class="state state-${state.status}">${state.status.toUpperCase()}</span></header><nav class="nav" aria-label="Platform navigation">${views.map((view) => `<button class="${state.view === view ? "active" : ""}" data-view="${view}" type="button">${labels[view]}</button>`).join("")}</nav>${state.lastError ? `<div class="error" role="alert"><strong>Recoverable error</strong><span>${escapeHtml(state.lastError)}</span><button id="clear-error" type="button">Dismiss</button></div>` : ""}${content}<footer><span class="muted">Host ${diagnostics.manifest.target}</span><button id="restart" type="button">Restart host</button></footer></main>`;
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", () => { workspace.navigate(button.dataset.view as PlatformWorkspaceView); render(); }));
  document.querySelector("#clear-error")?.addEventListener("click", () => { workspace.clearError(); render(); });
  document.querySelector("#restart")?.addEventListener("click", () => { try { if (host.getStatus() === "ready") host.stop(); workspace.start(); } catch (error) { workspace.reportError(error); } render(); });
}
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
try { workspace.start(); } catch (error) { workspace.reportError(error); }
render();