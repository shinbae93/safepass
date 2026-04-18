---
date: 2026-04-18
topic: Remove Nx, adopt pnpm workspaces
---

# Remove Nx — Adopt pnpm Workspaces

## Goal

Replace the Nx-based monorepo setup (documented in CLAUDE.md but never implemented) with a pnpm workspaces structure. `apps/api` is the only existing app; the workspace is scoped to what exists today.

## Workspace Structure

```
safepass/
├── package.json                   # root: scripts + shared devDependencies
├── pnpm-workspace.yaml            # declares apps/* as workspaces
├── pnpm-lock.yaml                 # single lockfile for all workspaces
├── .npmrc                         # shamefully-hoist=false
├── tsconfig.base.json             # shared TS base config (extended by each app)
├── .eslintrc.base.js              # shared ESLint base (extended by each app)
├── .prettierrc                    # single Prettier config for all apps
│
└── apps/
    └── api/                       # existing NestJS app — internals unchanged
        ├── package.json           # @safepass/api — app-specific deps only
        └── tsconfig.json          # extends ../../tsconfig.base.json
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
```

## Root `package.json`

```json
{
  "name": "safepass",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev:api":   "pnpm --filter @safepass/api start:dev",
    "build:api": "pnpm --filter @safepass/api build",
    "lint":      "pnpm -r lint",
    "format":    "pnpm -r format",
    "test":      "pnpm -r test"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.58.2",
    "@typescript-eslint/parser": "^8.58.2",
    "eslint": "^10.2.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.5",
    "prettier": "^3.8.3",
    "typescript": "^5.0.0"
  }
}
```

## `apps/api/package.json` devDependencies (after hoisting)

The shared tools move to root. `apps/api` retains only NestJS-specific devDeps:
- `@nestjs/cli`
- `@nestjs/testing`
- `@types/node`
- `@types/passport-jwt`
- `ts-node`

## Shared Config Files

**`tsconfig.base.json`** (root):
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**`apps/api/tsconfig.json`** extends root base:
```json
{
  "extends": "../../tsconfig.base.json",
  ...existing NestJS compiler options...
}
```

**`.eslintrc.base.js`** (root): shared ESLint rules. Each app's `.eslintrc.js` extends it.

**`.prettierrc`** (root): single config, applies to all apps.

## CLAUDE.md Updates

- "Monorepo: Nx workspace" → "Monorepo: pnpm workspaces"
- Remove all `npx nx` commands
- Replace Common Commands section with:

```bash
# Install all dependencies (run from root)
pnpm install

# Local dev
docker compose up db           # Start only PostgreSQL
pnpm dev:api                   # NestJS on :3000

# Build / lint / test
pnpm build:api
pnpm lint
pnpm test
```

- Docker Compose section unchanged (no Nx references there)

## Key Decisions

- Shared devDeps at root prevent version drift across apps when `client` and `desktop` are added later.
- `apps/api` internal structure is untouched — only its `package.json` devDeps change.
- Historical spec/plan docs are left as-is (they describe what was built, not tooling).
- `.npmrc` with `shamefully-hoist=false` enforces strict hoisting — apps must declare their own runtime deps explicitly.
