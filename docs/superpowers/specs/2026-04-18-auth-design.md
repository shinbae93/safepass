# Auth Feature Design

Date: 2026-04-18

## Overview

Implement the auth feature for both the NestJS API and the Electron desktop app. SafePass is a multi-user app — each user owns their own encrypted vault. Auth covers registration (setup) and login (unlock).

---

## API

### Endpoints

- `GET /api/auth/status` → `{ initialized: boolean }` — true if at least one user exists.
- `GET /api/auth/salt?username=<name>` → `{ salt: string }` — returns the stored salt for key derivation before unlock.
- `POST /api/auth/setup` body `{ username, salt, passwordHash }` → `{ token: string }` — registers a new user. Returns 409 if username is taken.
- `POST /api/auth/unlock` body `{ username, passwordHash }` → `{ token: string }` — verifies credentials with `timingSafeEqual`, returns JWT on success, 401 on failure.

### JWT

HS256, 24h expiry, payload `{ sub: userId }`.

### Database

`UserEntity` columns: `id (uuid)`, `username (unique)`, `salt`, `passwordHash`, `createdAt`, `updatedAt`. No vault data on the user row.

### DTOs

- `SetupDto`: `username`, `salt`, `passwordHash` (drops the old `encryptedData`/`iv` fields — vault is written separately after getting a token).
- `UnlockDto`: `username`, `passwordHash`.

---

## Desktop App

### Screens

**Register (`/setup`)**
- Fields: username, master password, confirm password.
- Flow: generate salt → derive key (PBKDF2) → hash key (SHA-256) → `POST /auth/setup` → store username via IPC → navigate to `/vault`.

**Login (`/unlock`)**
- Shows remembered usernames (loaded from electron-store via IPC on mount).
- "Use a different account" reveals a text input for manual username entry.
- Field: master password.
- Flow: `GET /auth/salt?username=<name>` → derive key → hash key → `POST /auth/unlock` → add username to store if new → navigate to `/vault`.

### electron-store IPC

- Dependency: `electron-store` added to `apps/desktop-app`.
- Main process: store schema `{ users: string[] }`. IPC handlers: `store:get-users` (returns array), `store:add-user` (appends if not present).
- Preload: exposes `window.storeAPI.getUsers(): Promise<string[]>` and `window.storeAPI.addUser(username: string): Promise<void>`.

### AuthContext changes

- Adds `username: string | null` state.
- `setUsername` exposed alongside `setJwt`.
- `lock()` clears both `jwt` and `username` from state, and `cryptoKeyRef.current` from memory.

### Routing

- `/setup` — shown when no users are registered (`initialized === false`).
- `/unlock` — shown when users exist but no active session.
- `/vault` — shown when session is active (key in memory + JWT).
- Navigation guard in `AppRoutes` enforces these rules.

---

## Security Invariants (unchanged)

- Master password and CryptoKey never leave the renderer process.
- Every vault save uses a fresh IV.
- Hash comparison on API uses `crypto.timingSafeEqual`.
- JWT and CryptoKey in JS memory only — never localStorage or disk.
