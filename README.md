# SafePass

A local, self-hosted password manager built with a zero-knowledge architecture. All encryption and decryption happens in the browser using the Web Crypto API — the server never sees plaintext passwords, only an encrypted blob. Designed as a single-user desktop application, SafePass runs entirely on your own machine with no cloud dependency.

---

## Features

- Master password setup and unlock flow with PBKDF2 key derivation (600,000 iterations)
- AES-256-GCM vault encryption — every save uses a fresh IV
- Per-entry vault CRUD: add, edit, delete, copy, and reveal passwords
- Category organization for vault entries
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
| Infra | Docker Compose |

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Electron Shell             │
│  ┌───────────────────────────────────┐  │
│  │     React Frontend (Vite)         │  │
│  │                                   │  │
│  │  SetupPage → UnlockPage → Vault   │  │
│  │                                   │  │
│  │  AuthContext (CryptoKey in memory)│  │
│  │  useVault (optimistic mutations)  │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼───────────────────────┘
                  │ HTTP (JWT)
┌─────────────────▼───────────────────────┐
│           NestJS API (:3000)            │
│                                         │
│  /auth  — setup, unlock, salt, status   │
│  /vault — per-entry CRUD (JWT-guarded)  │
│  /categories — org metadata             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          PostgreSQL 16                  │
│  user: salt + password_hash             │
│  vault: encrypted_data + iv             │
│  category: plaintext metadata           │
└─────────────────────────────────────────┘
```

Three database tables: `user` stores the salt and a SHA-256 hash of the derived key (not the password). `vault` stores the encrypted blob and IV per entry. `category` stores plaintext organizational metadata.

---

## Security Model

- **Zero-knowledge encryption:** The master password never leaves the browser. PBKDF2 (600,000 iterations) derives a `CryptoKey` from the password + a server-stored salt. The server stores only a SHA-256 hash of the derived key for verification — never the password itself.
- **AES-256-GCM:** Every vault save generates a fresh random IV. IV reuse with the same key would be catastrophic for GCM mode — this is enforced on every write.
- **In-memory only:** The `CryptoKey` and JWT are held in JavaScript memory (React context + ref). They are never written to `localStorage`, cookies, or disk.
- **Timing-safe comparison:** Password hash verification on the server uses `crypto.timingSafeEqual` to prevent timing attacks.
- **CORS:** Restricted to `http://localhost:5173`.

---

## How to Run

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ and [pnpm](https://pnpm.io/)

### Quick start (Docker)

```bash
# Copy and configure environment files
cp apps/api/.env.example apps/api/.env        # set DB_PASSWORD and JWT_SECRET
cp apps/desktop-app/.env.example apps/desktop-app/.env  # set VITE_API_URL=http://localhost:3000

docker compose up --build
```

Frontend runs at `http://localhost:5173` — API at `http://localhost:3000`.

### Local dev (faster iteration)

```bash
docker compose up db        # start PostgreSQL only

pnpm install

# Run in separate terminals:
pnpm dev:api                # NestJS on :3000
pnpm dev:desktop            # Electron + Vite on :5173
```

### Environment variables

**`apps/api/.env`**

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `safepass_dev` |
| `JWT_SECRET` | Secret for signing JWTs | `change_me` |
| `PORT` | API port | `3000` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |

**`apps/desktop-app/.env`**

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `http://localhost:3000` |

---
