import { describe, expect, it } from "vitest";
import { DeveloperIsolation } from "../developer-isolation/developer-isolation";

describe("DeveloperIsolation", () => {
  it("accepts core, module and adapter dependencies", () => {
    const report = new DeveloperIsolation().validate([
      { id: "core.runtime", version: "1", owner: "runtime", scope: "core", declaredDependencies: [] },
      { id: "adapter.web", version: "1", owner: "web", scope: "adapter", declaredDependencies: ["core.runtime"] },
      { id: "module.chat", version: "1", owner: "chat", scope: "module", declaredDependencies: ["core.runtime", "adapter.web"] }
    ]);
    expect(report.valid).toBe(true); expect(report.violations).toHaveLength(0);
  });
  it("rejects direct module-to-module dependencies", () => {
    const report = new DeveloperIsolation().validate([
      { id: "module.chat", version: "1", owner: "chat", scope: "module", declaredDependencies: ["module.live"] },
      { id: "module.live", version: "1", owner: "live", scope: "module", declaredDependencies: [] }
    ]);
    expect(report.valid).toBe(false); expect(report.violations[0]?.reason).toContain("not allowed");
  });
  it("rejects unknown, duplicate and self dependencies", () => {
    const report = new DeveloperIsolation().validate([
      { id: "module.chat", version: "1", owner: "chat", scope: "module", declaredDependencies: ["missing", "module.chat"] },
      { id: "module.chat", version: "1", owner: "other", scope: "module", declaredDependencies: [] }
    ]);
    expect(report.valid).toBe(false); expect(report.violations.length).toBeGreaterThanOrEqual(3);
  });
});
