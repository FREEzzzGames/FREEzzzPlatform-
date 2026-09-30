import type { PlatformWorkspace, PlatformWorkspaceSnapshot } from "../platform-workspace/platform-workspace";
import type { TargetStorageAdapter } from "../storage/platform-storage";
import type { Storage } from "../storage/storage";

export interface PlatformSessionState {
  readonly workspace: PlatformWorkspaceSnapshot;
  readonly selectedGameId: string | null;
  readonly savedAt: number;
}

export class PlatformSessionPersistence {
  private readonly store: Storage;
  constructor(adapter: TargetStorageAdapter, private readonly key = "platform-session") {
    this.store = adapter.create();
  }

  save(state: Omit<PlatformSessionState, "savedAt">): PlatformSessionState {
    const snapshot: PlatformSessionState = Object.freeze({ ...state, savedAt: Date.now() });
    this.store.set(this.key, JSON.stringify(snapshot));
    return snapshot;
  }

  load(): PlatformSessionState | undefined {
    const raw = this.store.get(this.key);
    if (typeof raw !== "string") return undefined;
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
    this.store.delete(this.key);
  }
}
