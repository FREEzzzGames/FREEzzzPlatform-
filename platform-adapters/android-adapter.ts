import { PlatformHost, type PlatformHostManifest } from "../platform-host/platform-host";
import type { PlatformShell } from "../platform-shell/platform-shell";
import type { PlatformAdapter } from "./platform-adapters";

export class AndroidPlatformAdapter implements PlatformAdapter {
  readonly id = "android";
  readonly version = "1.0.0";
  readonly target = "android" as const;
  supports(target: "web" | "android" | "telegram" | "custom"): boolean { return target === "android"; }
  createHost(shell: PlatformShell, manifest: PlatformHostManifest): PlatformHost { return new PlatformHost(manifest, shell); }
}
