import { describe, expect, it } from "vitest";
import { ConfigStore } from "../../configuration/configuration";

describe("Configuration stage 7", () => {
  it("stores and resolves configuration values", () => {
    const config = new ConfigStore({ environment: "test", retries: 3 });
    expect(config.get<string>("environment")).toBe("test");
    expect(config.require<number>("retries")).toBe(3);
    expect(config.keys()).toEqual(["environment", "retries"]);
  });

  it("supports mutation", () => {
    const config = new ConfigStore();
    config.set("enabled", true);
    expect(config.has("enabled")).toBe(true);
    expect(config.delete("enabled")).toBe(true);
    expect(config.has("enabled")).toBe(false);
  });

  it("fails clearly for missing required values", () => {
    const config = new ConfigStore();
    expect(() => config.require("missing")).toThrow("not defined");
  });
});
