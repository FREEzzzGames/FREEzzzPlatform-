import type { PlatformHostTarget } from "../platform-host/platform-host";

export interface PlatformTargetDescriptor {
  readonly target: PlatformHostTarget;
  readonly runtimeId: string;
  readonly capabilities: readonly string[];
}

const TARGETS: readonly PlatformTargetDescriptor[] = Object.freeze([
  Object.freeze({ target: "web", runtimeId: "web-runtime", capabilities: ["workspace","library","chat","live","radio","game"] }),
  Object.freeze({ target: "android", runtimeId: "android-runtime", capabilities: ["workspace","library","chat","live","radio","game","persistent-storage"] }),
  Object.freeze({ target: "telegram", runtimeId: "telegram-runtime", capabilities: ["workspace","library","chat","live","radio","game","telegram-webapp"] }),
  Object.freeze({ target: "custom", runtimeId: "custom-runtime", capabilities: ["workspace"] })
]);

export class PlatformTargetRegistry {
  list(): readonly PlatformTargetDescriptor[] { return TARGETS; }
  get(target: PlatformHostTarget): PlatformTargetDescriptor | undefined {
    return TARGETS.find(item => item.target === target);
  }
  require(target: PlatformHostTarget): PlatformTargetDescriptor {
    const descriptor = this.get(target);
    if (!descriptor) throw new Error(`Unsupported platform target: ${target}`);
    return descriptor;
  }
}
