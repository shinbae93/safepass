# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

SafePass is a local, self-hosted password manager with zero-knowledge key derivation. All encryption/decryption happens in the browser using the Web Crypto API (AES-256-GCM). The server never sees the master password — it stores a salt and a SHA-256 hash of the derived key for verification.

Multi-user app: users register with a username and master password. Subsequent launches require selecting a username and unlocking with the master password.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix)
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL 16 via TypeORM (`synchronize: true` in dev)
- **Auth**: Stateless JWT (HS256, 24h expiry, in-memory only)
- **Encryption**: Web Crypto API — PBKDF2 (600k iterations) for key derivation, AES-256-GCM for vault encryption

## Common Commands

### Dev (run from repo root)
```bash
pnpm install                   # Install all dependencies
pnpm dev:api                   # Start API dev server (NestJS on :3000)
pnpm dev:desktop               # Start Electron + Vite on :5173
pnpm build:api                 # Production build of API
pnpm lint                      # Lint all packages
pnpm format                    # Format all packages
pnpm test                      # Test all packages
```

### Per-app commands (run from apps/api)
```bash
pnpm migration:generate        # Generate migration from entity diff
pnpm migration:run             # Apply pending migrations
pnpm migration:revert          # Revert last migration
```

## Architecture

### Data model (vault)

The vault uses a **hybrid model**: the server stores individual rows per entry (`title`, `value`, `notes`). The server knows entry count but not the semantic meaning of values. Full zero-knowledge encryption is not implemented — `value` is stored as plaintext on the server.

Each vault operation hits a dedicated endpoint. All endpoints require a valid JWT; `userId` is extracted from the token via `JwtAuthGuard` and `JwtStrategy` (passport-jwt).

### Documentation structure

```
docs/
├── design/              # Design documents (the "Why" — architecture decisions, rationale)
│   ├── 01-overview.md
│   ├── 02-encryption-auth.md
│   ├── 03-api-spec.md
│   ├── 04-database-schema.md
│   ├── 05-frontend-architecture.md
│   └── 06-infrastructure.md
│
└── specs/               # Specifications (the "What/How/Verify" — source of truth for SDD)
    ├── specguide.md     # Project constitution: principles, constraints, test rules
    ├── shared/          # Cross-cutting specs (encryption, data-model, api-contracts, infrastructure)
    └── features/        # Per-feature specs, each with:
                         #   requirements.md  — The "What" (user stories, acceptance criteria)
                         #   technical.md     — The "How" (types, interfaces, component design)
                         #   test-plan.md     — The "Verification" (Given/When/Then scenarios)
```

When implementing features, always check `docs/specs/features/<feature>/` for specs first. Design docs in `docs/design/` provide historical context and rationale.

### Monorepo layout
```
apps/
  desktop-app/     # Electron app (React + Vite frontend)
    src/
      renderer/src/
        lib/         # crypto.ts, api.ts, utils.ts
        context/     # AuthContext (holds CryptoKey in memory via ref)
        hooks/       # useVault (vault CRUD + encrypt/decrypt cycle)
        pages/       # RegisterPage, LoginPage, VaultPage
        components/  # UI components + shadcn/ui primitives in components/ui/
        types/       # TypeScript interfaces
  api/             # NestJS backend
    src/
      modules/
        auth/      # register, login, salt, check-username, JWT guard
        vault/     # per-entry CRUD (JWT-guarded)
        health/    # health check
```

### Database (2 tables)

- **user**: One row per user. Stores username, salt, and password_hash (SHA-256 of derived key, not of the password).
- **vault**: One row per vault entry per user. Stores encrypted value + iv. No single-blob architecture.

TypeORM auto-converts camelCase properties to snake_case columns.

### API

Base URL: `http://localhost:3000/api`

- Auth endpoints (public): `GET /auth/salt`, `GET /auth/check-username`, `POST /auth/register`, `POST /auth/login`
- Vault endpoints (JWT required): `GET /vault`, `GET /vault/:id`, `POST /vault`, `PATCH /vault/:id`, `DELETE /vault/:id`

### Frontend routing

| Route       | Page         | Guard                                        |
|-------------|--------------|----------------------------------------------|
| `/register` | RegisterPage | Public                                       |
| `/login`    | LoginPage    | Public                                       |
| `/vault`    | VaultPage    | Only if unlocked (key in memory + valid JWT) |

State management: React Context + hooks only (no Redux/Zustand). AuthContext holds security state; useVault hook manages decrypted vault data with optimistic mutations and rollback on failure.

## Environment Variables

Defined in per-app `.env` files (git-ignored). Copy from `.env.example` in each app directory.

**`apps/api/.env`**

| Variable     | Default        |
|--------------|----------------|
| DB_HOST      | localhost      |
| DB_PORT      | 5432           |
| DB_USERNAME  | safepass       |
| DB_PASSWORD  | safepass_dev   |
| DB_NAME      | safepass       |
| JWT_SECRET   | change_me      |
| PORT         | 3000           |

**`apps/desktop-app/.env`**

| Variable     | Example                  |
|--------------|--------------------------|
| VITE_API_URL | http://localhost:3000    |

## Security Invariants

- The master password and CryptoKey must never leave the browser or be sent over the network.
- Every vault save must use a fresh IV (AES-GCM breaks catastrophically on IV reuse with the same key).
- Hash comparison on the server must use `crypto.timingSafeEqual`.
- JWT and CryptoKey are stored in JS memory only — never localStorage or cookies.
- CORS: currently `app.enableCors()` with no restrictions (open). Restrict in production.
