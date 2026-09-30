import type { Core } from "../core-api/core-api";
import type { CoreRegistry } from "../core-registry/core-registry";
import type { ModuleManager } from "../module-manager/module-manager";
import type { CapabilityRegistry } from "../capability-api/capability-api";
import type { EventBus, EventMap } from "../event-bus/event-bus";
import type { Configuration } from "../configuration/configuration";
import type { Storage } from "../storage/storage";

export interface CoreResolver {
  getCore(id: string): Core | undefined;
}

export interface PlatformSDK<E extends EventMap = EventMap> {
  readonly cores: CoreRegistry;
  readonly modules: ModuleManager;
  readonly capabilities: CapabilityRegistry;
  readonly events: EventBus<E>;
  readonly configuration: Configuration;
  readonly storage: Storage;
  getCore(id: string): Core | undefined;
}

export interface SDKDependencies<E extends EventMap = EventMap> {
  readonly cores: CoreRegistry;
  readonly modules: ModuleManager;
  readonly capabilities: CapabilityRegistry;
  readonly events: EventBus<E>;
  readonly configuration: Configuration;
  readonly storage: Storage;
  readonly coreResolver: CoreResolver;
}

export class DefaultPlatformSDK<E extends EventMap = EventMap> implements PlatformSDK<E> {
  readonly cores: CoreRegistry;
  readonly modules: ModuleManager;
  readonly capabilities: CapabilityRegistry;
  readonly events: EventBus<E>;
  readonly configuration: Configuration;
  readonly storage: Storage;
  private readonly coreResolver: CoreResolver;

  constructor(dependencies: SDKDependencies<E>) {
    this.cores = dependencies.cores;
    this.modules = dependencies.modules;
    this.capabilities = dependencies.capabilities;
    this.events = dependencies.events;
    this.configuration = dependencies.configuration;
    this.storage = dependencies.storage;
    this.coreResolver = dependencies.coreResolver;
  }

  getCore(id: string): Core | undefined {
    return this.coreResolver.getCore(id);
  }
}
