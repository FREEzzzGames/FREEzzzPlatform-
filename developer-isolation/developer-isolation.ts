interface DeveloperManifest {
  readonly id: string; readonly version: string; readonly owner: string;
  readonly scope: "core" | "module" | "adapter" | "platform" | "tooling";
  readonly declaredDependencies: readonly string[];
}

export interface IsolationPolicy {
  readonly allowedDependencyScopes: Readonly<Record<DeveloperManifest["scope"], readonly DeveloperManifest["scope"][]>>;
  readonly forbidDuplicateIds: boolean;
}
export interface IsolationViolation { readonly developerId: string; readonly dependencyId?: string; readonly reason: string; }
export interface IsolationReport { readonly valid: boolean; readonly violations: readonly IsolationViolation[]; }

export const DEFAULT_ISOLATION_POLICY: IsolationPolicy = Object.freeze({
  allowedDependencyScopes: Object.freeze({
    core: Object.freeze(["core", "adapter"]), module: Object.freeze(["module", "core", "adapter"]),
    adapter: Object.freeze(["core", "adapter"]), platform: Object.freeze(["core", "module", "adapter", "platform"]),
    tooling: Object.freeze(["tooling"])
  }), forbidDuplicateIds: true
});

export class DeveloperIsolation {
  constructor(private readonly policy: IsolationPolicy = DEFAULT_ISOLATION_POLICY) {}
  validate(manifests: readonly DeveloperManifest[]): IsolationReport {
    const violations: IsolationViolation[] = []; const byId = new Map<string, DeveloperManifest>();
    for (const manifest of manifests) {
      if (!manifest.id.trim() || !manifest.version.trim() || !manifest.owner.trim()) {
        violations.push({ developerId: manifest.id, reason: "Developer manifest must contain id, version and owner." }); continue;
      }
      if (this.policy.forbidDuplicateIds && byId.has(manifest.id)) violations.push({ developerId: manifest.id, reason: "Duplicate developer scope id." });
      else byId.set(manifest.id, manifest);
    }
    for (const manifest of manifests) {
      const allowed = this.policy.allowedDependencyScopes[manifest.scope] ?? [];
      for (const dependencyId of manifest.declaredDependencies) {
        const dependency = byId.get(dependencyId);
        if (!dependency) { violations.push({ developerId: manifest.id, dependencyId, reason: "Dependency is not declared in the isolation set." }); continue; }
        if (!allowed.includes(dependency.scope)) violations.push({ developerId: manifest.id, dependencyId, reason: "Dependency scope is not allowed for this developer scope." });
        if (dependencyId === manifest.id) violations.push({ developerId: manifest.id, dependencyId, reason: "Self-dependency is not allowed." });
      }
    }
    return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
  }
  assertValid(manifests: readonly DeveloperManifest[]): void {
    const report = this.validate(manifests); if (!report.valid) throw new Error(report.violations.map(v => v.developerId + ": " + v.reason).join("\n"));
  }
}