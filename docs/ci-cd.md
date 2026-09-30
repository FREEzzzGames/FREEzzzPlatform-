# GitHub / CI/CD

Stage 24 defines the repository verification boundary.

## CI checks

Every push and pull request runs dependency installation with npm ci, strict TypeScript typecheck and the Vitest test suite. The CI matrix verifies Node.js 20 and 22.

## Release check

The manual Release Check workflow repeats typecheck and tests on Node.js 22. It does not publish artifacts or releases.

## Security and isolation

GitHub Actions receives read-only repository contents permissions. No Telegram tokens, Android signing keys or other credentials are stored in workflows.

## Boundary

Stage 24 does not implement deployment, application signing, Telegram credentials, Android packaging, marketplace logic or portal economy.
