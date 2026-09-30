export interface ModuleMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

export interface ModuleContext {
  readonly ownerCoreId: string;
}

export interface Module {
  readonly metadata: ModuleMetadata;
  initialize(context: ModuleContext): void;
  dispose(): void;
}

export abstract class BaseModule implements Module {
  readonly metadata: ModuleMetadata;
  private initialized = false;

  protected constructor(metadata: ModuleMetadata) {
    if (!metadata.id.trim() || !metadata.name.trim() || !metadata.version.trim()) {
      throw new Error("Module metadata must contain id, name and version.");
    }
    this.metadata = Object.freeze({ ...metadata });
  }

  initialize(context: ModuleContext): void {
    if (this.initialized) return;
    if (!context.ownerCoreId.trim()) throw new Error("Module owner core id must not be empty.");
    this.onInitialize(context);
    this.initialized = true;
  }

  dispose(): void {
    if (!this.initialized) return;
    this.onDispose();
    this.initialized = false;
  }

  isInitialized(): boolean { return this.initialized; }

  protected onInitialize(_context: ModuleContext): void {}
  protected onDispose(): void {}
}
