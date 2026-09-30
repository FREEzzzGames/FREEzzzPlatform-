import { PlatformBootstrap } from "../platform-shell/platform-bootstrap";
import { PlatformHealth } from "../platform-shell/platform-health";
import { PlatformShell } from "../platform-shell/platform-shell";
import "./styles.css";

const shell = new PlatformShell();
const bootstrap = new PlatformBootstrap(shell);
const health = new PlatformHealth(shell);
const mount = document.querySelector<HTMLDivElement>("#app");
if (!mount) throw new Error("Platform shell mount point is missing.");

function render(): void {
  const diagnostics = shell.getDiagnostics();
  const bootstrapDiagnostics = bootstrap.getDiagnostics();
  const healthReport = health.check();
  const runtime = diagnostics.runtime;
  const error = diagnostics.error ?? runtime.error;
  mount.innerHTML = `
    <section class="shell">
      <header><div><span class="eyebrow">FREEzzz</span><h1>Platform</h1></div><span class="state state-${diagnostics.status}">${diagnostics.status.toUpperCase()}</span></header>
      <div class="grid">
        <article><span>Runtime</span><strong>${runtime.status}</strong><small>${runtime.uptimeMs} ms uptime</small></article>
        <article><span>Cores</span><strong>${diagnostics.cores}</strong><small>registered</small></article>
        <article><span>Modules</span><strong>${diagnostics.modules}</strong><small>installed</small></article>
        <article><span>Capabilities</span><strong>${diagnostics.capabilities}</strong><small>registered</small></article>
      </div>
      <div class="details">
        <div><span>Configuration</span><strong>${diagnostics.configurationKeys}</strong></div>
        <div><span>Storage</span><strong>${diagnostics.storageKeys}</strong></div>
        <div><span>Health</span><strong>${healthReport.status.toUpperCase()}</strong></div>
        <div><span>Bootstrap</span><strong>${bootstrapDiagnostics.status.toUpperCase()}</strong></div>
      </div>
      ${error ? `<div class="error" role="alert"><strong>Platform error</strong><span>${escapeHtml(error.message)}</span></div>` : ""}
      <footer>
        <button id="refresh" type="button">Refresh diagnostics</button>
        ${diagnostics.status === "ready" ? '<button id="stop" type="button">Stop runtime</button>' : '<button id="start" type="button">Start runtime</button>'}
      </footer>
    </section>`;

  document.querySelector("#refresh")?.addEventListener("click", render);
  document.querySelector("#stop")?.addEventListener("click", () => { try { shell.stop(); } catch (error) { console.error(error); } render(); });
  document.querySelector("#start")?.addEventListener("click", () => { try { bootstrap.start(); } catch (error) { console.error(error); } render(); });
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

try { shell.start(); } catch (error) { console.error(error); }
render();
