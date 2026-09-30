# Developer Isolation

Stage 26 defines the ownership and dependency-isolation boundary for independent platform work.

## Policy

Each scope declares an id, version, owner, scope and explicit dependency identifiers. Cores may depend on cores and adapters. Modules may depend on cores and adapters, but not other modules. Adapters may depend on cores and adapters. Platform integration may compose cores, modules and adapters. Tooling remains isolated to tooling.

Unknown dependencies, duplicate identifiers and self-dependencies are rejected.

## Boundary

This is a policy and validation contract. It does not inspect repositories, enforce filesystem permissions, execute developer code or replace GitHub permissions. CI and repository controls remain separate infrastructure.

Stage 21 remains permanently excluded: developer isolation contains no marketplace or portal economy mechanism.
