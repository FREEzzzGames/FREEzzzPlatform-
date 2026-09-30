export type ReleaseChannel = "development" | "preview" | "stable";
export type ReleaseStatus = "draft" | "candidate" | "released" | "deprecated";
export type ReleaseTarget = "web" | "android" | "telegram" | "custom";

export interface ReleaseArtifact {
  readonly id: string;
  readonly version: string;
  readonly target: ReleaseTarget;
  readonly fileName: string;
  readonly size: number;
  readonly checksum: string;
}

export interface ReleaseManifest {
  readonly id: string;
  readonly version: string;
  readonly channel: ReleaseChannel;
  readonly status: ReleaseStatus;
  readonly artifacts: readonly ReleaseArtifact[];
  readonly createdAt: number;
  readonly notes?: string;
}

export interface ReleasePolicy {
  readonly requireArtifacts: boolean;
  readonly requireChecksums: boolean;
  readonly allowedChannels: readonly ReleaseChannel[];
}

export const DEFAULT_RELEASE_POLICY: ReleasePolicy = Object.freeze({
  requireArtifacts: true,
  requireChecksums: true,
  allowedChannels: Object.freeze(["development", "preview", "stable"])
});

export class ReleaseCatalog {
  private readonly releases = new Map<string, ReleaseManifest>();

  register(manifest: ReleaseManifest): void {
    if (!manifest.id.trim() || !manifest.version.trim()) throw new Error("Release id and version must not be empty.");
    if (this.releases.has(manifest.id)) throw new Error(`Release already exists: ${manifest.id}`);
    this.releases.set(manifest.id, Object.freeze({ ...manifest, artifacts: Object.freeze([...manifest.artifacts]) }));
  }
  get(id: string): ReleaseManifest | undefined { return this.releases.get(id); }
  list(): readonly ReleaseManifest[] { return Object.freeze([...this.releases.values()]); }
  replace(manifest: ReleaseManifest): void {
    if (!this.releases.has(manifest.id)) throw new Error(`Unknown release: ${manifest.id}`);
    this.releases.set(manifest.id, Object.freeze({ ...manifest, artifacts: Object.freeze([...manifest.artifacts]) }));
  }
  clear(): void { this.releases.clear(); }
}

export class ReleaseManager {
  constructor(private readonly policy: ReleasePolicy = DEFAULT_RELEASE_POLICY, readonly catalog = new ReleaseCatalog()) {}

  validate(manifest: ReleaseManifest): void {
    if (!this.policy.allowedChannels.includes(manifest.channel)) throw new Error("Release channel is not allowed.");
    if (manifest.createdAt < 0 || !Number.isFinite(manifest.createdAt)) throw new Error("Release createdAt must be a finite non-negative number.");
    if (this.policy.requireArtifacts && manifest.artifacts.length === 0) throw new Error("Release must contain at least one artifact.");
    const ids = new Set<string>();
    for (const artifact of manifest.artifacts) {
      if (!artifact.id.trim() || !artifact.version.trim() || !artifact.fileName.trim()) throw new Error("Release artifact metadata is incomplete.");
      if (artifact.size < 0 || !Number.isFinite(artifact.size)) throw new Error("Release artifact size must be finite and non-negative.");
      if (this.policy.requireChecksums && !artifact.checksum.trim()) throw new Error("Release artifact checksum must not be empty.");
      if (ids.has(artifact.id)) throw new Error(`Duplicate release artifact: ${artifact.id}`);
      ids.add(artifact.id);
    }
  }

  createCandidate(manifest: ReleaseManifest): ReleaseManifest {
    this.validate(manifest);
    if (manifest.status !== "draft" && manifest.status !== "candidate") throw new Error("Only draft releases can become candidates.");
    const candidate = Object.freeze({ ...manifest, status: "candidate" as const, artifacts: Object.freeze([...manifest.artifacts]) });
    this.catalog.register(candidate);
    return candidate;
  }

  release(id: string): ReleaseManifest {
    const current = this.catalog.get(id);
    if (!current) throw new Error(`Unknown release: ${id}`);
    if (current.status !== "candidate") throw new Error("Only candidate releases can be released.");
    const released = Object.freeze({ ...current, status: "released" as const });
    this.catalog.replace(released);
    return released;
  }

  deprecate(id: string): ReleaseManifest {
    const current = this.catalog.get(id);
    if (!current) throw new Error(`Unknown release: ${id}`);
    if (current.status !== "released") throw new Error("Only released versions can be deprecated.");
    const deprecated = Object.freeze({ ...current, status: "deprecated" as const });
    this.catalog.replace(deprecated);
    return deprecated;
  }
}
