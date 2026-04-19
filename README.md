# SafePass

A local, self-hosted password manager built with a zero-knowledge architecture. All encryption and decryption happens in the browser using the Web Crypto API — the server never sees plaintext passwords, only an encrypted blob. Supports multiple users on a shared desktop installation, each with their own encrypted vault.

---

## Features

- Multi-user support — each user has their own vault protected by their own master password
- Master password registration and login with PBKDF2 key derivation (600,000 iterations)
- AES-256-GCM vault encryption — every save uses a fresh IV
- Per-entry vault CRUD: add, edit, delete, copy, and reveal passwords
- Search and filter across the vault
- JWT-based session management (in-memory only, never persisted)
- Tokyo Night light theme UI

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 16 via TypeORM |
| Auth | Stateless JWT (HS256, 24h expiry) |
| Encryption | Web Crypto API — PBKDF2 + AES-256-GCM |
| Runtime | Electron (desktop shell) |
| Monorepo | pnpm workspaces |

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Electron Shell             │
│  ┌───────────────────────────────────┐  │
│  │     React Frontend (Vite)         │  │
│  │                                   │  │
│  │  RegisterPage → LoginPage → Vault │  │
│  │                                   │  │
│  │  AuthContext (CryptoKey in memory)│  │
│  │  useVault (optimistic mutations)  │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼───────────────────────┘
                  │ HTTP (JWT)
┌─────────────────▼───────────────────────┐
│           NestJS API (:3000)            │
│                                         │
│  /auth  — salt, check-username,         │
│           register, login               │
│  /vault — per-entry CRUD (JWT-guarded)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          PostgreSQL 16                  │
│  user: username + salt + password_hash  │
│  vault: per-entry encrypted rows + iv   │
└─────────────────────────────────────────┘
```

Two database tables: `user` stores the username, salt, and a SHA-256 hash of the derived key (not the password). `vault` stores per-entry encrypted rows, each with its own IV.

---

## Security Model

- **Zero-knowledge key derivation:** The master password never leaves the browser. PBKDF2 (600,000 iterations) derives a `CryptoKey` from the password + a server-stored salt. The server stores only a SHA-256 hash of the derived key for verification — never the password itself.
- **AES-256-GCM:** Every vault save generates a fresh random IV. IV reuse with the same key would be catastrophic for GCM mode — this is enforced on every write.
- **In-memory only:** The `CryptoKey` and JWT are held in JavaScript memory (React context + ref). They are never written to `localStorage`, cookies, or disk.
- **Timing-safe comparison:** Password hash verification on the server uses `crypto.timingSafeEqual` to prevent timing attacks.

---

## How to Run

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and [pnpm](https://pnpm.io/)
- [PostgreSQL](https://www.postgresql.org/) 16

### Setup

```bash
# Copy and configure environment files
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DB_HOST, DB_PASSWORD, and JWT_SECRET

cp apps/desktop-app/.env.example apps/desktop-app/.env
# Edit apps/desktop-app/.env — set VITE_API_URL=http://localhost:3000

pnpm install
```

### Run

```bash
# Run in separate terminals:
pnpm dev:api        # NestJS API on :3000
pnpm dev:desktop    # Electron + Vite on :5173
```

### Environment variables

**`apps/api/.env`**

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | PostgreSQL user | `safepass` |
| `DB_PASSWORD` | PostgreSQL password | `safepass_dev` |
| `DB_NAME` | Database name | `safepass` |
| `JWT_SECRET` | Secret for signing JWTs | `change_me` |
| `PORT` | API port | `3000` |

**`apps/desktop-app/.env`**

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `http://localhost:3000` |
