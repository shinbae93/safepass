---
name: README Design
description: Design spec for the public GitHub README for SafePass
type: project
---

# README Design — SafePass

## Context

SafePass is a completed personal/portfolio project. The README targets other developers on GitHub. No screenshots or GIFs — purely text-based.

## Structure

1. **Overview** — what it is, zero-knowledge angle, self-hosted, single-user desktop app
2. **Features** — bullet list of user-facing and security features
3. **Tech Stack** — table: frontend, backend, database, auth, encryption, runtime, monorepo, infra
4. **Architecture** — ASCII diagram showing Electron shell → React frontend → NestJS API → PostgreSQL
5. **Security Model** — zero-knowledge encryption, AES-256-GCM fresh IV, in-memory key/JWT, timing-safe comparison, CORS
6. **How to Run** — prerequisites, Docker quick start, local dev steps, environment variables table

## Approved Content

### Overview
SafePass is a local, self-hosted password manager built with a zero-knowledge architecture. All encryption and decryption happens in the browser using the Web Crypto API — the server never sees plaintext passwords, only an encrypted blob. Designed as a single-user desktop application, SafePass runs entirely on your own machine with no cloud dependency.

### Features
- Master password setup and unlock flow with PBKDF2 key derivation (600,000 iterations)
- AES-256-GCM vault encryption — every save uses a fresh IV
- Per-entry vault CRUD: add, edit, delete, copy, and reveal passwords
- Category organization for vault entries
- Search and filter across the vault
- JWT-based session management (in-memory only, never persisted)
- Tokyo Night light theme UI

### Tech Stack
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

### Architecture
ASCII diagram: Electron shell wrapping React frontend → HTTP with JWT → NestJS API → PostgreSQL.

Three DB tables: user (salt + password_hash), vault (encrypted_data + iv), category (plaintext metadata).

### Security Model
- Zero-knowledge: master password never leaves browser; PBKDF2 derives CryptoKey; server stores only SHA-256 hash of derived key
- AES-256-GCM with fresh random IV on every vault save
- CryptoKey and JWT in JS memory only — never localStorage, cookies, or disk
- timing-safe hash comparison on server
- CORS restricted to localhost:5173

### How to Run
- Prerequisites: Docker + Docker Compose, Node.js 18+, pnpm
- Docker quick start: copy .env.example, docker compose up --build
- Local dev: docker compose up db, then pnpm dev:api + pnpm dev:desktop
- Env vars table: DB_PASSWORD, JWT_SECRET, VITE_API_URL
