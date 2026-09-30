import { PlatformShell } from "../platform-shell/platform-shell";
import "./styles.css";

const shell = new PlatformShell();
shell.start();
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Platform shell mount point is missing.");

function render(): void {
  const status = shell.getStatus();
  const runtime = status.runtime;
  app.innerHTML = `
    <section class="shell">
      <header><div><span class="eyebrow">FREEzzz</span><h1>Platform</h1></div><span class="state">${runtime.status.toUpperCase()}</span></header>
      <div class="grid">
        <article><span>Runtime</span><strong>${runtime.status}</strong><small>${runtime.uptimeMs} ms uptime</small></article>
        <article><span>Cores</span><strong>${status.cores}</strong><small>registered</small></article>
        <article><span>Modules</span><strong>${status.modules}</strong><small>installed</small></article>
        <article><span>Capabilities</span><strong>${status.capabilities}</strong><small>registered</small></article>
      </div>
      <footer><button id="refresh">Refresh diagnostics</button><button id="stop">Stop runtime</button></footer>
    </section>`;
  document.querySelector("#refresh")?.addEventListener("click", render);
  document.querySelector("#stop")?.addEventListener("click", () => { shell.stop(); render(); });
}
render();
