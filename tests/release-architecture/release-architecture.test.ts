import { describe, expect, it } from "vitest";
import { ReleaseManager } from "../../release-architecture/release-architecture";

const manifest = { id: "release-1", version: "1.0.0", channel: "stable" as const, status: "draft" as const, createdAt: 1, artifacts: [{ id: "web", version: "1.0.0", target: "web" as const, fileName: "platform.zip", size: 10, checksum: "abc" }] };

describe("ReleaseArchitecture", () => {
  it("validates and promotes a release through candidate and released states", () => {
    const manager = new ReleaseManager();
    const candidate = manager.createCandidate(manifest);
    expect(candidate.status).toBe("candidate");
    expect(manager.release(candidate.id).status).toBe("released");
  });
  it("supports deprecation only after release", () => {
    const manager = new ReleaseManager();
    manager.createCandidate(manifest);
    expect(() => manager.deprecate(manifest.id)).toThrow();
    manager.release(manifest.id);
    expect(manager.deprecate(manifest.id).status).toBe("deprecated");
  });
  it("rejects incomplete artifacts and duplicate artifact ids", () => {
    const manager = new ReleaseManager();
    expect(() => manager.validate({ ...manifest, artifacts: [] })).toThrow();
    expect(() => manager.validate({ ...manifest, artifacts: [manifest.artifacts[0], manifest.artifacts[0]] })).toThrow();
    expect(() => manager.validate({ ...manifest, artifacts: [{ ...manifest.artifacts[0], checksum: "" }] })).toThrow();
  });
});
