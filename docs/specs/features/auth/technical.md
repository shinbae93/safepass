# Auth Feature — Technical Specification

## Architecture Overview

Authentication is split across three layers:

- **API** (`apps/api`) — NestJS. Stores users, verifies credentials, issues JWTs.
- **Desktop main process** (`apps/desktop-app/src/main`) — Electron. Persists known users to disk via `electron-store`.
- **Desktop renderer** (`apps/desktop-app/src/renderer`) — React. Drives all UI and crypto; holds the derived `CryptoKey` in memory only.

The renderer never has direct file system or Node access. It communicates with the main process through a typed IPC bridge (`contextBridge`) and with the API over HTTP.

---

## Crypto Primitives

```
master password
      |
      v
PBKDF2(password, salt, 600_000 iterations, SHA-256)
      |
      v
CryptoKey  ──────────────────────────────────────► held in React ref, never persisted
      |
      v
SHA-256(exportedKey)  ──────────────────────────► passwordHash  →  sent to API / stored in DB
```

- **Salt**: 16 random bytes, generated client-side at registration, stored on the server.
- **Key derivation**: PBKDF2 via Web Crypto API — never leaves the renderer process.
- **Verification hash**: `SHA-256` of the raw exported key bytes, base64-encoded. The server stores this and compares with `crypto.timingSafeEqual`.
- **JWT**: HS256, 24-hour expiry, stored in React `AuthContext` state (JS memory only).

---

## Sequence Diagrams

### Register

```
User          App (Register screen)       API              Local storage
 |                    |                    |                     |
 | fill form           |                    |                     |
 |──────────────────► |                    |                     |
 |                    |                    |                     |
 |                    | 1. generate salt   |                     |
 |                    | 2. derive key from password + salt       |
 |                    | 3. hash the key    |                     |
 |                    |                    |                     |
 |                    |── POST /auth/register ───────────────►   |
 |                    |   username, salt, passwordHash           |
 |                    |                    |                     |
 |                    |                    | check username      |
 |                    |                    | save new user       |
 |                    |◄── { token, userId } ───────────────     |
 |                    |                    |                     |
 |                    |── save { id, username } ───────────────► |
 |                    |                    |                     |
 |◄── open vault ──── |                    |                     |
```

---

### Login — pick from saved accounts

```
User          App (Login screen)          API              Local storage
 |                    |                    |                     |
 | open app           |                    |                     |
 |──────────────────► |── load saved users ────────────────────► |
 |                    |◄── [{ id, username }, ...] ───────────── |
 |                    |                    |                     |
 | select username    |                    |                     |
 | enter password     |                    |                     |
 | press Sign In      |                    |                     |
 |──────────────────► |                    |                     |
 |                    |── GET /auth/salt?userId= ───────────►    |
 |                    |◄── { salt } ────────────────────────     |
 |                    |                    |                     |
 |                    | derive key from password + salt          |
 |                    | hash the key       |                     |
 |                    |                    |                     |
 |                    |── POST /auth/login ─────────────────►    |
 |                    |   userId, passwordHash                   |
 |                    |                    | verify hash         |
 |                    |◄── { token } ───────────────────────     |
 |                    |                    |                     |
 |◄── open vault ──── |                    |                     |
```

---

### Login — type username manually (account from another machine)

```
User          App (Login screen)          API              Local storage
 |                    |                    |                     |
 | click              |                    |                     |
 | "Use a different   |                    |                     |
 |  account"          |                    |                     |
 |──────────────────► |                    |                     |
 |                    |                    |                     |
 | type username      |                    |                     |
 | enter password     |                    |                     |
 | press Sign In      |                    |                     |
 |──────────────────► |                    |                     |
 |                    |── GET /auth/salt?username= ──────────►   |
 |                    |◄── { userId, salt } ────────────────     |
 |                    |                    |                     |
 |                    | derive key from password + salt          |
 |                    | hash the key       |                     |
 |                    |                    |                     |
 |                    |── POST /auth/login ─────────────────►    |
 |                    |   userId, passwordHash                   |
 |                    |                    | verify hash         |
 |                    |◄── { token } ───────────────────────     |
 |                    |                    |                     |
 |                    |── save { id, username } ───────────────► |
 |                    |   (remembered for next time)             |
 |◄── open vault ──── |                    |                     |
```

---

### Lock

```
User          App (Vault screen)
 |                    |
 | click Lock         |
 |─────────────────► |
 |                    | clear key from memory
 |                    | clear JWT
 |◄── go to Login ── |
```

---

## API Endpoints

### `GET /auth/check-username?username=`

Check whether a username is already registered. Used by the register form for real-time availability feedback.

|              |                       |
| ------------ | --------------------- |
| Auth         | None                  |
| Query        | `username: string`    |
| Response 200 | `{ exists: boolean }` |

### `GET /auth/salt`

Retrieve the salt for a user so the client can derive the key before sending credentials.

|              |                                             |
| ------------ | ------------------------------------------- |
| Auth         | None                                        |
| Query        | `userId: string` **or** `username: string`  |
| Response 200 | `{ userId: string, salt: string }` (base64) |
| Response 401 | Unknown user                                |

> Accepts `username` to support login from a machine where the user ID is not yet stored locally.

### `POST /auth/register`

|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| Auth         | None                                                       |
| Body         | `{ username: string, salt: string, passwordHash: string }` |
| Response 201 | `{ token: string, userId: string }`                        |
| Response 409 | Username already taken                                     |

### `POST /auth/login`

|              |                                            |
| ------------ | ------------------------------------------ |
| Auth         | None                                       |
| Body         | `{ userId: string, passwordHash: string }` |
| Response 200 | `{ token: string }`                        |
| Response 401 | Invalid credentials                        |

---

## IPC Bridge (`storeAPI`)

Exposed to the renderer via `contextBridge`. Backed by `electron-store` in the main process.

| Method                                     | IPC channel       | Description                          |
| ------------------------------------------ | ----------------- | ------------------------------------ |
| `getUsers(): Promise<StoredUser[]>`        | `store:get-users` | Returns all locally-known users      |
| `addUser(user: StoredUser): Promise<void>` | `store:add-user`  | Upserts a user by ID (no duplicates) |

```typescript
interface StoredUser {
  id: string; // UUID from the API
  username: string;
}
```

---

## Routing Guard

`App.tsx` registers a `useEffect` on `jwt`. When `jwt` is `null` the app navigates to `/login`; when it is set it navigates to `/vault`. There is no server-side session check on startup — the app always begins at `/login` and the user authenticates fresh each launch.

```
App starts
    |
    v
/login  <── jwt === null
    |
    v  (successful login / register)
/vault  <── jwt !== null
    |
    v  (lock())
/login
```

---

## Security Invariants

| Invariant                                 | Where enforced                                      |
| ----------------------------------------- | --------------------------------------------------- |
| Master password never leaves the renderer | Web Crypto API only — no serialisation              |
| `CryptoKey` never persisted               | Held in a React `ref`, cleared on lock              |
| JWT never written to disk                 | React state only, lost on app restart               |
| Hash comparison is timing-safe            | `crypto.timingSafeEqual` in `auth.service.ts`       |
| Salt is unique per user                   | Generated client-side with `crypto.getRandomValues` |
| JWT expiry                                | 24 hours (HS256), enforced by `@nestjs/jwt`         |
