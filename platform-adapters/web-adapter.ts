import { PlatformHost, type PlatformHostManifest } from "../platform-host/platform-host";
import type { PlatformShell } from "../platform-shell/platform-shell";
import type { PlatformAdapter } from "./platform-adapters";

export class WebPlatformAdapter implements PlatformAdapter {
  readonly id = "web";
  readonly version = "1.0.0";
  readonly target = "web" as const;
  supports(target: "web" | "android" | "telegram" | "custom"): boolean { return target === "web"; }
  createHost(shell: PlatformShell, manifest: PlatformHostManifest): PlatformHost { return new PlatformHost(manifest, shell); }
}
