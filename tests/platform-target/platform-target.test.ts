import { describe, expect, it } from "vitest";
import { PlatformTargetRegistry } from "../../platform-target/platform-target";

describe("PlatformTargetRegistry", () => {
  it("exposes the four isolated runtime targets", () => {
    const registry = new PlatformTargetRegistry();
    expect(registry.list().map(item => item.target)).toEqual(["web","android","telegram","custom"]);
    expect(registry.require("android").capabilities).toContain("persistent-storage");
    expect(registry.require("telegram").capabilities).toContain("telegram-webapp");
  });

  it("rejects unknown targets", () => {
    const registry = new PlatformTargetRegistry();
    expect(() => registry.require("bad" as never)).toThrow("Unsupported platform target");
  });
});
