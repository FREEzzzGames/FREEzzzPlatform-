import { describe, expect, it } from "vitest";
import { SecurityGuard, SecurityPolicyRegistry, redactSecret, validateTextInput } from "../security/security";

describe("Security", () => {
  it("authorizes only explicitly granted permissions", () => {
    const policies = new SecurityPolicyRegistry();
    policies.register({ principalId: "module.chat", permissions: ["read", "storage"] });
    const guard = new SecurityGuard(policies);
    expect(guard.authorize({ principal: { id: "module.chat", type: "module" }, permission: "read" }).allowed).toBe(true);
    expect(guard.authorize({ principal: { id: "module.chat", type: "module" }, permission: "network" }).allowed).toBe(false);
    expect(guard.authorize({ principal: { id: "unknown", type: "module" }, permission: "read" }).allowed).toBe(false);
  });

  it("validates bounded input", () => {
    expect(() => validateTextInput("abc", { maxLength: 3 })).not.toThrow();
    expect(() => validateTextInput("abcd", { maxLength: 3 })).toThrow();
    expect(() => validateTextInput("123", { pattern: /^[0-9]+$/ })).not.toThrow();
    expect(() => validateTextInput("abc", { pattern: /^[0-9]+$/ })).toThrow();
  });

  it("redacts secret material while retaining a short suffix", () => {
    expect(redactSecret("secret-token")).toBe("********-oken");
    expect(redactSecret("abc")).toBe("****");
  });

  it("rejects duplicate policies", () => {
    const registry = new SecurityPolicyRegistry();
    registry.register({ principalId: "core", permissions: ["read"] });
    expect(() => registry.register({ principalId: "core", permissions: ["write"] })).toThrow();
  });
});
