import { describe, expect, it } from "vitest";
import { CoreRegistry } from "../../core-registry/core-registry";

describe("Core Registry stage 2", () => {
  it("registers and discovers cores", () => {
    const registry = new CoreRegistry();
    const core = registry.register({ id: "demo", name: "Demo Core", version: "1.0.0" });
    expect(core.id).toBe("demo");
    expect(registry.has("demo")).toBe(true);
    expect(registry.get("demo")).toEqual(core);
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicate ids", () => {
    const registry = new CoreRegistry();
    const core = { id: "demo", name: "Demo Core", version: "1.0.0" };
    registry.register(core);
    expect(() => registry.register(core)).toThrow("already registered");
  });

  it("unregisters cores", () => {
    const registry = new CoreRegistry();
    registry.register({ id: "demo", name: "Demo Core", version: "1.0.0" });
    expect(registry.unregister("demo")).toBe(true);
    expect(registry.has("demo")).toBe(false);
    expect(registry.unregister("missing")).toBe(false);
  });

  it("rejects invalid metadata", () => {
    const registry = new CoreRegistry();
    expect(() => registry.register({ id: "", name: "Demo", version: "1.0.0" }))
      .toThrow("Core id must not be empty.");
  });
});
