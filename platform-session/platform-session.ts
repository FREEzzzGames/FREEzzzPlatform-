import type { PlatformWorkspace, PlatformWorkspaceSnapshot } from "../platform-workspace/platform-workspace";
import type { TargetStorageAdapter } from "../storage/platform-storage";

export interface PlatformSessionState {
  readonly workspace: PlatformWorkspaceSnapshot;
  readonly selectedGameId: string | null;
  readonly savedAt: number;
}

export class PlatformSessionPersistence {
  constructor(private readonly storage: TargetStorageAdapter, private readonly key = "platform-session") {}

  save(state: Omit<PlatformSessionState, "savedAt">): PlatformSessionState {
    const snapshot: PlatformSessionState = Object.freeze({ ...state, savedAt: Date.now() });
    this.storage.set(this.key, JSON.stringify(snapshot));
    return snapshot;
  }

  load(): PlatformSessionState | undefined {
    const raw = this.storage.get(this.key);
    if (!raw) return undefined;
    try {
      const value = JSON.parse(raw) as PlatformSessionState;
      if (!value || typeof value.savedAt !== "number" || !value.workspace) return undefined;
      return Object.freeze({
        workspace: Object.freeze({ view: value.workspace.view, revision: value.workspace.revision }),
        selectedGameId: typeof value.selectedGameId === "string" ? value.selectedGameId : null,
        savedAt: value.savedAt
      });
    } catch {
      return undefined;
    }
  }

  restore(workspace: PlatformWorkspace, state: PlatformSessionState): void {
    workspace.restore(state.workspace);
  }

  clear(): void {
    this.storage.remove(this.key);
  }
}
