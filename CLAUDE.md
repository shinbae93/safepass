# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

SafePass is a local, self-hosted, zero-knowledge password manager. All encryption/decryption happens in the browser using the Web Crypto API (AES-256-GCM). The server never sees plaintext passwords — it stores only an encrypted blob, a salt, and a verification hash.

Single-user app: no registration flow. First launch sets a master password; subsequent launches require unlocking with it.

## Tech Stack

- **Monorepo**: Nx workspace
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix)
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL 16 via TypeORM (`synchronize: true` in dev)
- **Auth**: Stateless JWT (HS256, 24h expiry, in-memory only)
- **Encryption**: Web Crypto API — PBKDF2 (600k iterations) for key derivation, AES-256-GCM for vault encryption

## Common Commands

### Docker Compose (full stack)
```bash
docker compose up              # Start all services
docker compose up --build      # Rebuild after dependency changes
docker compose down            # Stop everything
docker compose down -v         # Reset database (removes pgdata volume)
docker compose exec db psql -U safepass -d safepass  # Access DB directly
```

### Local dev (faster iteration)
```bash
docker compose up db           # Start only PostgreSQL
npx nx serve server            # Terminal 1: NestJS on :3000
npx nx serve client            # Terminal 2: Vite on :5173
```

### Nx commands
```bash
npx nx serve <project>         # Dev server (client or server)
npx nx build <project>         # Production build
npx nx run-many -t build       # Build all projects
npx nx run-many -t lint        # Lint all projects
npx nx run-many -t test        # Test all projects
npx nx affected -t build       # Build only affected projects
```

## Architecture

### Encryption model (critical to understand)

The vault is stored as a **single encrypted blob** — not individual entries. This prevents the server from knowing entry count, which entry changed, or any metadata. Every save generates a fresh IV and re-encrypts the entire vault.

Key derivation flow: `master password → PBKDF2(password, salt, 600k) → CryptoKey`. The CryptoKey is held in a React ref (not state) and never persisted. The server only receives `SHA-256(exportedKey)` for verification.

Core crypto module: `apps/client/src/lib/crypto.ts`

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
  client/          # React frontend (Vite)
    src/
      lib/         # crypto.ts, api.ts, utils.ts
      context/     # AuthContext (holds CryptoKey in memory via ref)
      hooks/       # useVault (vault CRUD + encrypt/decrypt cycle)
      pages/       # setup, unlock, vault
      components/  # UI components + shadcn/ui primitives in components/ui/
      types/       # TypeScript interfaces
  server/          # NestJS backend
    src/
      auth/        # Setup, unlock, JWT guard
      vault/       # GET/PUT encrypted blob
      categories/  # CRUD (plaintext, organizational metadata)
      entities/    # TypeORM entities (User, Vault, Category)
```

### Database (3 tables)

- **user**: Single row. Stores salt + password_hash (SHA-256 of derived key, not of the password).
- **vault**: Single row per user. Stores encrypted_data blob + iv. UNIQUE constraint on user_id.
- **category**: Multiple rows. Plaintext organizational metadata. When deleted, client-side code nullifies categoryId in vault entries before re-encrypting.

TypeORM auto-converts camelCase properties to snake_case columns.

### API

Base URL: `http://localhost:3000/api`

- Auth endpoints (public): `GET /auth/status`, `GET /auth/salt`, `POST /auth/setup`, `POST /auth/unlock`
- Vault endpoints (JWT required): `GET /vault`, `PUT /vault`
- Category endpoints (JWT required): `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`

### Frontend routing

| Route     | Page       | Guard                                      |
|-----------|------------|---------------------------------------------|
| `/setup`  | SetupPage  | Only if not initialized                     |
| `/unlock` | UnlockPage | Only if initialized but not unlocked        |
| `/vault`  | VaultPage  | Only if unlocked (key in memory + valid JWT)|

State management: React Context + hooks only (no Redux/Zustand). AuthContext holds security state; useVault hook manages decrypted vault data with optimistic mutations and rollback on failure.

## Environment Variables

Defined in `.env` at project root (git-ignored):

| Variable     | Used By      | Default                    |
|--------------|--------------|----------------------------|
| DB_PASSWORD  | db, server   | safepass_dev               |
| JWT_SECRET   | server       | dev_jwt_secret_change_me   |
| VITE_API_URL | client       | http://localhost:3000      |

## Security Invariants

- The master password and CryptoKey must never leave the browser or be sent over the network.
- Every vault save must use a fresh IV (AES-GCM breaks catastrophically on IV reuse with the same key).
- Hash comparison on the server must use `crypto.timingSafeEqual`.
- JWT and CryptoKey are stored in JS memory only — never localStorage or cookies.
- CORS is restricted to `http://localhost:5173`.
