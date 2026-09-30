export type SecurityPermission = "read" | "write" | "execute" | "network" | "storage" | "device";

export interface SecurityPrincipal {
  readonly id: string;
  readonly type: "core" | "module" | "adapter" | "developer" | "system";
}

export interface SecurityPolicy {
  readonly principalId: string;
  readonly permissions: readonly SecurityPermission[];
}

export interface SecurityRequest {
  readonly principal: SecurityPrincipal;
  readonly permission: SecurityPermission;
}

export interface SecurityDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export class SecurityPolicyRegistry {
  private readonly policies = new Map<string, SecurityPolicy>();

  register(policy: SecurityPolicy): void {
    if (!policy.principalId.trim()) throw new Error("Security policy principal id must not be empty.");
    if (this.policies.has(policy.principalId)) throw new Error(`Security policy already registered: ${policy.principalId}`);
    this.policies.set(policy.principalId, Object.freeze({ ...policy, permissions: Object.freeze([...policy.permissions]) }));
  }

  unregister(principalId: string): boolean { return this.policies.delete(principalId); }
  get(principalId: string): SecurityPolicy | undefined { return this.policies.get(principalId); }
  list(): readonly SecurityPolicy[] { return Object.freeze([...this.policies.values()]); }
  clear(): void { this.policies.clear(); }
}

export class SecurityGuard {
  constructor(readonly policies = new SecurityPolicyRegistry()) {}

  authorize(request: SecurityRequest): SecurityDecision {
    if (!request.principal.id.trim()) return { allowed: false, reason: "Principal id must not be empty." };
    const policy = this.policies.get(request.principal.id);
    if (!policy) return { allowed: false, reason: "No security policy is registered for the principal." };
    if (!policy.permissions.includes(request.permission)) return { allowed: false, reason: "Permission is not granted by the security policy." };
    return { allowed: true, reason: "Permission granted." };
  }

  assertAuthorized(request: SecurityRequest): void {
    const decision = this.authorize(request);
    if (!decision.allowed) throw new Error(decision.reason);
  }
}

export interface InputConstraint {
  readonly maxLength?: number;
  readonly pattern?: RegExp;
}

export function validateTextInput(value: string, constraint: InputConstraint = {}): void {
  if (constraint.maxLength !== undefined && value.length > constraint.maxLength) throw new Error("Input exceeds the maximum length.");
  if (constraint.pattern !== undefined && !constraint.pattern.test(value)) throw new Error("Input does not satisfy the required pattern.");
}

export function redactSecret(value: string): string {
  if (value.length <= 4) return "****";
  return "*".repeat(Math.max(4, value.length - 4)) + value.slice(-4);
}
