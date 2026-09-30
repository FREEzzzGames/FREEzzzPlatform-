import { describe, expect, it } from "vitest";
import { CapabilityRegistry } from "../../capability-api/capability-api";

describe("Capability API stage 5", () => {
  it("registers and resolves capabilities", () => {
    const registry = new CapabilityRegistry();
    const capability = { id: "clock", version: "1.0.0", provide: () => 42 };
    registry.register(capability);

    expect(registry.has("clock")).toBe(true);
    expect(registry.get("clock")).toBe(capability);
    expect(registry.require("clock").provide()).toBe(42);
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicate capability ids", () => {
    const registry = new CapabilityRegistry();
    const capability = { id: "clock", version: "1.0.0", provide: () => 42 };
    registry.register(capability);
    expect(() => registry.register(capability)).toThrow("already registered");
  });

  it("fails clearly for missing capabilities", () => {
    const registry = new CapabilityRegistry();
    expect(() => registry.require("missing")).toThrow("not registered");
  });
});
