# SafePass — Project Overview

## What is SafePass?

SafePass is a **local, self-hosted password manager** with end-to-end encryption. The server never sees your plaintext passwords — all encryption and decryption happens in your browser.

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Monorepo       | Nx                                |
| Frontend       | React 18 + Vite + TypeScript      |
| UI             | Tailwind CSS + shadcn/ui (Radix)  |
| Backend        | NestJS + TypeScript                |
| Database       | PostgreSQL 16                      |
| ORM            | TypeORM                           |
| Auth           | JWT (stateless)                   |
| Encryption     | Web Crypto API (AES-256-GCM)      |
| Infrastructure | Docker Compose (all local)         |

## Core Principles

1. **Zero-knowledge** — The server stores only encrypted blobs. It cannot read your passwords, titles, or notes.
2. **Single user** — No registration. On first launch, set a master password. On return, unlock with it.
3. **Local-first** — Runs entirely on your machine via Docker Compose. No cloud, no third-party services.
4. **Simple MVP** — Vault CRUD, categories, E2E encryption. No browser extension, no sharing, no import/export (yet).

## Features (MVP)

- Set/unlock master password
- Create, read, update, delete vault entries
- Each entry: title, username, password, URL, notes, custom fields (key-value)
- Organize entries into categories/folders
- Built-in password generator
- Search and filter entries
- Copy password to clipboard (auto-clear after 30s)
- Auto-lock after inactivity
- Lock button (clears encryption key from memory)

## Project Structure (Nx Monorepo)

```
safepass/
├── nx.json                    # Nx workspace configuration
├── package.json               # Root package.json (workspaces)
├── tsconfig.base.json         # Shared TypeScript config
├── docker-compose.yml         # Orchestrates all services
├── .env                       # Environment variables
├── docs/                      # Design documents (you are here)
│
├── apps/
│   ├── client/                # React frontend (Vite)
│   │   ├── Dockerfile
│   │   ├── project.json       # Nx project config (targets: serve, build, lint)
│   │   ├── src/
│   │   │   ├── lib/           # crypto.ts, api.ts, utils.ts
│   │   │   ├── context/       # AuthContext (holds key in memory)
│   │   │   ├── hooks/         # useAuth, useVault
│   │   │   ├── pages/         # setup, unlock, vault
│   │   │   ├── components/    # UI components
│   │   │   └── types/         # TypeScript interfaces
│   │   └── ...config files
│   │
│   └── server/                # NestJS backend
│       ├── Dockerfile
│       ├── project.json       # Nx project config (targets: serve, build, lint)
│       ├── src/
│       │   ├── auth/          # Auth module (setup, unlock, JWT)
│       │   ├── vault/         # Vault module (GET/PUT encrypted blob)
│       │   ├── categories/    # Categories module (CRUD)
│       │   └── entities/      # TypeORM entities
│       └── ...config files
```

## Implementation Phases

| Phase | Focus                    | Description                                                   |
|-------|--------------------------|---------------------------------------------------------------|
| 1     | Infrastructure           | Nx workspace, Docker Compose, project scaffolding, dev env    |
| 2     | Backend — Auth           | User entity, setup/unlock endpoints, JWT guard                |
| 3     | Backend — Vault & Cats   | Vault blob storage, category CRUD                             |
| 4     | Frontend — Crypto & Auth | Web Crypto implementation, auth context, setup/unlock pages   |
| 5     | Frontend — Vault UI      | Entry list, entry form, categories sidebar, search            |
| 6     | Polish                   | Loading states, toasts, clipboard, auto-lock, confirmations   |

## Related Documents

- [02 — Encryption & Auth Flow](./02-encryption-auth.md)
- [03 — API Specification](./03-api-spec.md)
- [04 — Database Schema](./04-database-schema.md)
- [05 — Frontend Architecture](./05-frontend-architecture.md)
- [06 — Infrastructure (Docker)](./06-infrastructure.md)
