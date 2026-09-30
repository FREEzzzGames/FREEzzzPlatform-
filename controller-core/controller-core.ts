export type ControllerCoreStatus = "created" | "ready" | "running" | "stopped" | "failed";

export type ControllerButton =
  | "up"
  | "down"
  | "left"
  | "right"
  | "a"
  | "b"
  | "x"
  | "y"
  | "l"
  | "r"
  | "select"
  | "start"
  | "menu"
  | "back";

export type ControllerAction = "press" | "release";

export interface ControllerInput {
  readonly controllerId: string;
  readonly button: ControllerButton;
  readonly action: ControllerAction;
  readonly timestamp: number;
}

export interface ControllerState {
  readonly controllerId: string;
  readonly buttons: ReadonlySet<ControllerButton>;
}

export interface ControllerDevice {
  readonly id: string;
  readonly version: string;
  readonly maxControllers: number;
  initialize(): void;
  poll(): readonly ControllerInput[];
  reset(): void;
  getStatus(): ControllerCoreStatus;
}

export interface ControllerAdapter {
  readonly id: string;
  readonly version: string;
  readonly target: "web" | "android-native" | "telegram" | "custom";
  supports(deviceId: string): boolean;
  createDevice(): ControllerDevice;
}

export class ControllerRegistry {
  private readonly adapters = new Map<string, ControllerAdapter>();

  register(adapter: ControllerAdapter): void {
    if (!adapter.id.trim() || !adapter.version.trim()) {
      throw new Error("Controller adapter must contain id and version.");
    }
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Controller adapter "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  get(id: string): ControllerAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): readonly ControllerAdapter[] {
    return [...this.adapters.values()];
  }

  resolve(deviceId: string, target: ControllerAdapter["target"]): ControllerAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.target === target && adapter.supports(deviceId)) return adapter;
    }
    throw new Error(`No controller adapter supports "${deviceId}" for target "${target}".`);
  }
}

export class ControllerStateStore {
  private readonly states = new Map<string, Set<ControllerButton>>();

  apply(input: ControllerInput): ControllerState {
    if (!input.controllerId.trim()) throw new Error("Controller id must not be empty.");
    const buttons = this.states.get(input.controllerId) ?? new Set<ControllerButton>();
    if (input.action === "press") buttons.add(input.button);
    else buttons.delete(input.button);
    this.states.set(input.controllerId, buttons);
    return this.snapshot(input.controllerId);
  }

  get(controllerId: string): ControllerState {
    if (!controllerId.trim()) throw new Error("Controller id must not be empty.");
    return this.snapshot(controllerId);
  }

  clear(controllerId?: string): void {
    if (controllerId === undefined) {
      this.states.clear();
      return;
    }
    this.states.delete(controllerId);
  }

  private snapshot(controllerId: string): ControllerState {
    return {
      controllerId,
      buttons: new Set(this.states.get(controllerId) ?? [])
    };
  }
}

export interface ControllerCore {
  readonly status: ControllerCoreStatus;
  readonly registry: ControllerRegistry;
  readonly state: ControllerStateStore;
  initialize(): void;
  start(): void;
  stop(): void;
  reset(): void;
  poll(): readonly ControllerInput[];
}

export class DefaultControllerCore implements ControllerCore {
  private _status: ControllerCoreStatus = "created";
  readonly registry = new ControllerRegistry();
  readonly state = new ControllerStateStore();

  get status(): ControllerCoreStatus {
    return this._status;
  }

  initialize(): void {
    if (this._status !== "created" && this._status !== "stopped") return;
    this._status = "ready";
  }

  start(): void {
    if (this._status === "running") return;
    if (this._status === "created") this.initialize();
    if (this._status !== "ready" && this._status !== "stopped") {
      throw new Error(`Controller core cannot start while status is "${this._status}".`);
    }
    this._status = "running";
  }

  stop(): void {
    if (this._status === "created" || this._status === "stopped") return;
    this._status = "stopped";
  }

  reset(): void {
    this.state.clear();
  }

  poll(): readonly ControllerInput[] {
    if (this._status !== "running") {
      throw new Error("Controller core must be running before polling.");
    }

    const inputs: ControllerInput[] = [];
    for (const adapter of this.registry.list()) {
      const device = adapter.createDevice();
      device.initialize();
      inputs.push(...device.poll());
      device.reset();
    }

    for (const input of inputs) this.state.apply(input);
    return inputs;
  }
}
