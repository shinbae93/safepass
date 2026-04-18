# Remove Nx — Adopt pnpm Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Nx-based monorepo setup (documented but never implemented) with pnpm workspaces, hoisting shared devDependencies to root, and updating CLAUDE.md to reflect the new workflow.

**Architecture:** A root `pnpm-workspace.yaml` declares `apps/*` as workspaces. Shared devDependencies (TypeScript, ESLint, Prettier) live at the root `package.json`. `apps/api` keeps only NestJS-specific devDeps. A root `tsconfig.base.json` and `.prettierrc` are shared across apps.

**Tech Stack:** pnpm workspaces, TypeScript, ESLint (flat config), Prettier, NestJS

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `pnpm-workspace.yaml` | Declares `apps/*` as workspace packages |
| Create | `package.json` | Root scripts + shared devDependencies |
| Create | `.npmrc` | Disable shameful hoisting |
| Create | `tsconfig.base.json` | Shared TS compiler base |
| Create | `.prettierrc` | Single Prettier config for all apps |
| Create | `eslint.config.base.js` | Shared ESLint rules |
| Modify | `apps/api/package.json` | Remove devDeps now at root |
| Modify | `apps/api/tsconfig.json` | Extend root tsconfig.base.json |
| Modify | `apps/api/eslint.config.js` | Extend root eslint.config.base.js |
| Delete | `apps/api/.prettierrc` | Replaced by root `.prettierrc` |
| Modify | `CLAUDE.md` | Replace Nx references with pnpm commands |

---

## Task 1: Create root workspace files

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
```

- [ ] **Step 2: Create `.npmrc`**

```ini
shamefully-hoist=false
```

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml .npmrc
git commit -m "chore: add pnpm workspace config"
```

---

## Task 2: Create root `package.json`

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "safepass",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter @safepass/api start:dev",
    "build:api": "pnpm --filter @safepass/api build",
    "lint": "pnpm -r lint",
    "format": "pnpm -r format",
    "test": "pnpm -r test"
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

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add root package.json with pnpm workspace scripts"
```

---

## Task 3: Create shared TypeScript base config

**Files:**
- Create: `tsconfig.base.json`
- Modify: `apps/api/tsconfig.json`

- [ ] **Step 1: Create `tsconfig.base.json` at root**

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

- [ ] **Step 2: Update `apps/api/tsconfig.json` to extend root base**

Replace the full contents of `apps/api/tsconfig.json` with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

Note: options already covered by `tsconfig.base.json` (`skipLibCheck`, `forceConsistentCasingInFileNames`, `esModuleInterop`, `allowSyntheticDefaultImports`) are removed from the app config since they are inherited.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json apps/api/tsconfig.json
git commit -m "chore: add root tsconfig.base.json, extend from apps/api"
```

---

## Task 4: Move Prettier config to root

**Files:**
- Create: `.prettierrc`
- Delete: `apps/api/.prettierrc`

- [ ] **Step 1: Create root `.prettierrc`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

- [ ] **Step 2: Delete `apps/api/.prettierrc`**

```bash
rm apps/api/.prettierrc
```

- [ ] **Step 3: Commit**

```bash
git add .prettierrc
git rm apps/api/.prettierrc
git commit -m "chore: move Prettier config to root"
```

---

## Task 5: Create shared ESLint base config and update apps/api

**Files:**
- Create: `eslint.config.base.js`
- Modify: `apps/api/eslint.config.js`

- [ ] **Step 1: Create `eslint.config.base.js` at root**

```js
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = {
  plugins: { '@typescript-eslint': tseslint, prettier },
  rules: {
    ...tseslint.configs['recommended'].rules,
    ...prettierConfig.rules,
    'prettier/prettier': 'error',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

- [ ] **Step 2: Update `apps/api/eslint.config.js` to extend root base**

```js
const tsparser = require('@typescript-eslint/parser');
const base = require('../../eslint.config.base');

module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: base.plugins,
    rules: base.rules,
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add eslint.config.base.js apps/api/eslint.config.js
git commit -m "chore: add root ESLint base config, extend from apps/api"
```

---

## Task 6: Update `apps/api/package.json` — remove hoisted devDeps

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Remove shared devDependencies from `apps/api/package.json`**

Replace the `devDependencies` section. Remove: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier`, `typescript`. Keep only NestJS-specific devDeps:

```json
{
  "name": "@safepass/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/terminus": "^11.1.1",
    "@nestjs/typeorm": "^10.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "pg": "^8.11.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0",
    "typeorm": "^0.3.17"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/passport-jwt": "^4.0.0",
    "ts-node": "^10.9.1"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/package.json
git commit -m "chore(api): remove devDeps now hoisted to root"
```

---

## Task 7: Install dependencies and verify

**Files:** none (verification only)

- [ ] **Step 1: Delete the existing `apps/api/node_modules` and `package-lock.json`**

```bash
rm -rf apps/api/node_modules apps/api/package-lock.json
```

- [ ] **Step 2: Install from root using pnpm**

```bash
pnpm install
```

Expected: pnpm creates `node_modules` at root (hoisted shared devDeps) and `apps/api/node_modules` for app-specific packages. A `pnpm-lock.yaml` is created at root.

- [ ] **Step 3: Verify API lint passes**

```bash
pnpm lint
```

Expected: no lint errors.

- [ ] **Step 4: Verify API builds**

```bash
pnpm build:api
```

Expected: `apps/api/dist/` is generated with no TypeScript errors.

- [ ] **Step 5: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm-lock.yaml after workspace install"
```

---

## Task 8: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Tech Stack section**

Change:
```
- **Monorepo**: Nx workspace
```
To:
```
- **Monorepo**: pnpm workspaces
```

- [ ] **Step 2: Replace the Common Commands section**

Replace the entire `## Common Commands` section with:

```markdown
## Common Commands

### Docker Compose (full stack)
\`\`\`bash
docker compose up              # Start all services
docker compose up --build      # Rebuild after dependency changes
docker compose down            # Stop everything
docker compose down -v         # Reset database (removes pgdata volume)
docker compose exec db psql -U safepass -d safepass  # Access DB directly
\`\`\`

### Local dev (faster iteration)
\`\`\`bash
docker compose up db           # Start only PostgreSQL
pnpm dev:api                   # Terminal 1: NestJS on :3000
\`\`\`

### pnpm commands (run from repo root)
\`\`\`bash
pnpm install                   # Install all dependencies
pnpm dev:api                   # Start API dev server
pnpm build:api                 # Production build of API
pnpm lint                      # Lint all packages
pnpm format                    # Format all packages
pnpm test                      # Test all packages
\`\`\`

### Per-app commands (run from apps/api)
\`\`\`bash
pnpm migration:generate        # Generate migration from entity diff
pnpm migration:run             # Apply pending migrations
pnpm migration:revert          # Revert last migration
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect pnpm workspaces, remove Nx"
```
