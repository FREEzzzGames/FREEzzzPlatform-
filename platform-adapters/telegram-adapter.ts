import { PlatformHost, type PlatformHostManifest } from "../platform-host/platform-host";
import type { PlatformShell } from "../platform-shell/platform-shell";
import type { PlatformAdapter } from "./platform-adapters";

export class TelegramPlatformAdapter implements PlatformAdapter {
  readonly id = "telegram";
  readonly version = "1.0.0";
  readonly target = "telegram" as const;
  supports(target: "web" | "android" | "telegram" | "custom"): boolean { return target === "telegram"; }
  createHost(shell: PlatformShell, manifest: PlatformHostManifest): PlatformHost { return new PlatformHost(manifest, shell); }
}
