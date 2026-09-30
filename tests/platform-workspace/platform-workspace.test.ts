import { describe, expect, it } from "vitest";
import { PlatformHost } from "../../platform-host/platform-host";
import { PlatformShell } from "../../platform-shell/platform-shell";
import { PlatformWorkspace } from "../../platform-workspace/platform-workspace";

const manifest = { id: "workspace-host", name: "Workspace Host", version: "1.0.0", target: "web" as const };

describe("PlatformWorkspace", () => {
  it("navigates independent views without module coupling", () => {
    const host = new PlatformHost(manifest, new PlatformShell());
    const workspace = new PlatformWorkspace(host);
    workspace.start();

    workspace.navigate("library");
    expect(workspace.getState()).toMatchObject({ view: "library", status: "ready", revision: 1 });
    workspace.navigate("chat");
    expect(workspace.getState().view).toBe("chat");
  });

  it("preserves and restores a workspace snapshot", () => {
    const workspace = new PlatformWorkspace(new PlatformHost(manifest, new PlatformShell()));
    workspace.navigate("live");
    const snapshot = workspace.snapshot();
    workspace.navigate("radio");
    workspace.restore(snapshot);
    expect(workspace.getState()).toMatchObject({ view: "live", revision: snapshot.revision });
  });

  it("exposes recoverable errors", () => {
    const workspace = new PlatformWorkspace(new PlatformHost(manifest, new PlatformShell()));
    workspace.reportError(new Error("temporary failure"));
    expect(workspace.getState().status).toBe("degraded");
    workspace.clearError();
    expect(workspace.getState().lastError).toBeNull();
  });
});
