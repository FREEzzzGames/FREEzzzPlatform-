export type AndroidIntegrationStatus = "created" | "ready" | "running" | "stopped" | "failed";
export type AndroidLifecycleEvent = "create" | "start" | "resume" | "pause" | "stop" | "destroy";
export interface AndroidAppInfo { readonly id: string; readonly packageName: string; readonly version: string; }
export interface AndroidIntent { readonly action: string; readonly data?: string; readonly extras?: Readonly<Record<string, string>>; }
export interface AndroidWindow { readonly width: number; readonly height: number; readonly density: number; }
export interface AndroidHost {
  readonly id: string; readonly version: string;
  initialize(app: AndroidAppInfo): void; start(): void; stop(): void;
  dispatchIntent(intent: AndroidIntent): void; getWindow(): AndroidWindow; getStatus(): AndroidIntegrationStatus;
}
export interface AndroidHostAdapter {
  readonly id: string; readonly version: string;
  supports(hostId: string): boolean; createHost(): AndroidHost;
}
export class AndroidHostRegistry {
  private readonly adapters = new Map<string, AndroidHostAdapter>();
  register(adapter: AndroidHostAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) throw new Error("Android host adapter must contain id and version.");
    if (this.adapters.has(adapter.id)) throw new Error("Android host adapter already exists.");
    this.adapters.set(adapter.id, adapter);
  }
  unregister(id: string): boolean { return this.adapters.delete(id); }
  get(id: string): AndroidHostAdapter | undefined { return this.adapters.get(id); }
  list(): readonly AndroidHostAdapter[] { return [...this.adapters.values()]; }
  resolve(hostId: string): AndroidHostAdapter {
    for (const adapter of this.adapters.values()) if (adapter.supports(hostId)) return adapter;
    throw new Error("No Android host supports the requested host.");
  }
}
export type AndroidLifecycleHandler = (event: AndroidLifecycleEvent) => void;
export class AndroidLifecycleRouter {
  private readonly handlers = new Map<AndroidLifecycleEvent, Set<AndroidLifecycleHandler>>();
  on(event: AndroidLifecycleEvent, handler: AndroidLifecycleHandler): () => void {
    const handlers = this.handlers.get(event) ?? new Set<AndroidLifecycleHandler>();
    handlers.add(handler); this.handlers.set(event, handlers);
    return () => { handlers.delete(handler); if (!handlers.size) this.handlers.delete(event); };
  }
  dispatch(event: AndroidLifecycleEvent): void { for (const handler of [...(this.handlers.get(event) ?? [])]) handler(event); }
  clear(): void { this.handlers.clear(); }
}
export interface AndroidIntegrationApi {
  readonly status: AndroidIntegrationStatus; readonly hosts: AndroidHostRegistry; readonly lifecycle: AndroidLifecycleRouter;
  initialize(app: AndroidAppInfo): void; selectHost(hostId: string): void; start(): void; stop(): void;
  dispatchIntent(intent: AndroidIntent): void; getWindow(): AndroidWindow; dispose(): void;
}
export class AndroidIntegration implements AndroidIntegrationApi {
  private statusValue: AndroidIntegrationStatus = "created";
  private app?: AndroidAppInfo; private host?: AndroidHost;
  readonly hosts = new AndroidHostRegistry(); readonly lifecycle = new AndroidLifecycleRouter();
  get status(): AndroidIntegrationStatus { return this.statusValue; }
  initialize(app: AndroidAppInfo): void {
    if (this.statusValue !== "created" && this.statusValue !== "stopped") throw new Error("Android integration cannot initialize in the current state.");
    if (!app.id.trim() || !app.packageName.trim() || !app.version.trim()) throw new Error("Android app info must contain id, package name and version.");
    this.app = Object.freeze({ ...app }); this.statusValue = "ready";
  }
  selectHost(hostId: string): void {
    if (this.statusValue === "running") throw new Error("Android host cannot be changed while running.");
    this.host = this.hosts.resolve(hostId).createHost();
  }
  start(): void {
    if (this.statusValue === "running") return;
    if (this.statusValue === "created") throw new Error("Android integration must be initialized before starting.");
    if (this.statusValue !== "ready" && this.statusValue !== "stopped") throw new Error("Android integration cannot start in the current state.");
    if (!this.host || !this.app) throw new Error("Android host must be selected before starting.");
    this.host.initialize(this.app); this.host.start(); this.statusValue = "running";
    this.lifecycle.dispatch("create"); this.lifecycle.dispatch("start"); this.lifecycle.dispatch("resume");
  }
  stop(): void {
    if (this.statusValue === "created" || this.statusValue === "stopped") return;
    this.lifecycle.dispatch("pause"); this.lifecycle.dispatch("stop"); this.host?.stop(); this.statusValue = "stopped";
  }
  dispatchIntent(intent: AndroidIntent): void {
    this.requireRunning();
    if (!intent.action.trim()) throw new Error("Android intent action must not be empty.");
    this.host!.dispatchIntent({ ...intent, extras: intent.extras ? { ...intent.extras } : undefined });
  }
  getWindow(): AndroidWindow { this.requireRunning(); return { ...this.host!.getWindow() }; }
  dispose(): void { this.stop(); this.lifecycle.dispatch("destroy"); this.lifecycle.clear(); this.host = undefined; this.app = undefined; this.statusValue = "stopped"; }
  private requireRunning(): void { if (this.statusValue !== "running") throw new Error("Android integration must be running."); }
}
