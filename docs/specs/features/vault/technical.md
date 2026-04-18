# Vault Feature — Technical Specification

## Architecture Overview

The vault feature spans three layers:

- **API** (`apps/api`) — NestJS. JWT-guarded CRUD endpoints; stores one row per vault entry in PostgreSQL via TypeORM.
- **Desktop renderer** (`apps/desktop-app/src/renderer`) — React. Per-entry API calls, optimistic UI updates, and all vault UI.
- **Desktop main process** — No involvement in vault operations (vault data is not persisted locally).

---

## Data Model

### `vault_entry` table (TypeORM entity: `VaultEntity`)

| Column       | Type        | Constraints                        |
|-------------|-------------|------------------------------------|
| `id`         | uuid        | PK, generated (`uuid_generate_v4`) |
| `user_id`    | uuid        | FK → `user.id`, CASCADE DELETE     |
| `title`      | text        | NOT NULL                           |
| `value`      | text        | NOT NULL                           |
| `notes`      | text        | nullable                           |
| `created_at` | timestamptz | auto, set on insert                |
| `updated_at` | timestamptz | auto, updated on save              |

TypeORM auto-converts camelCase entity properties to snake_case columns.

### Frontend TypeScript type

```typescript
interface VaultEntry {
  id: string;
  title: string;
  value: string;
  notes: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface CreateVaultEntryRequest {
  title: string;
  value: string;
  notes?: string;
}

interface UpdateVaultEntryRequest {
  title?: string;
  value?: string;
  notes?: string | null;
}
```

---

## Backend

### JWT Guard

All vault endpoints are protected by `JwtAuthGuard` (class-level `@UseGuards`). The guard is implemented via `passport-jwt`:

- `JwtStrategy` validates the token and returns `{ userId: payload.sub }` attached to `request.user`.
- `@CurrentUser()` param decorator extracts `request.user.userId` in controller handlers.
- `AuthModule` exports both `JwtModule` and `JwtAuthGuard` so `VaultModule` can import them.

### API Endpoints

Base path: `/api/vault`. All endpoints require `Authorization: Bearer <token>`.

| Method   | Path         | Request body                           | Response         | Errors        |
|----------|--------------|----------------------------------------|------------------|---------------|
| `GET`    | `/vault`     | —                                      | `VaultEntry[]`   | 401           |
| `GET`    | `/vault/:id` | —                                      | `VaultEntry`     | 401, 404      |
| `POST`   | `/vault`     | `{ title, value, notes? }`             | `VaultEntry` 201 | 401, 400      |
| `PATCH`  | `/vault/:id` | `{ title?, value?, notes? }`           | `VaultEntry`     | 401, 404, 400 |
| `DELETE` | `/vault/:id` | —                                      | 204 No Content   | 401, 404      |

Ownership is enforced on every operation: all queries filter by both `id` and `userId`. A request for an entry that exists but belongs to a different user returns 404 (not 403) to avoid leaking existence.

### Module structure

```
apps/api/src/modules/vault/
  vault.controller.ts          — 5 JWT-guarded endpoints, @CurrentUser() on all handlers
  vault.service.ts             — thin layer; throws NotFoundException when entry not found
  vault.module.ts              — imports DatabaseModule + AuthModule
  dto/
    create-vault-entry.dto.ts  — title (required), value (required), notes (optional)
    update-vault-entry.dto.ts  — all fields optional

apps/api/src/database/repositories/
  vault.repository.ts          — findAllByUser, findOneByUser, create, update, deleteOne

apps/api/src/modules/auth/
  jwt.strategy.ts              — PassportStrategy(Strategy), validate() → { userId }
  jwt-auth.guard.ts            — AuthGuard('jwt')
  decorators/current-user.decorator.ts  — @CurrentUser() extracts userId from request
```

### VaultRepository methods

```typescript
findAllByUser(userId: string): Promise<VaultEntity[]>
findOneByUser(id: string, userId: string): Promise<VaultEntity | null>
create(userId: string, data: { title: string; value: string; notes?: string }): Promise<VaultEntity>
update(id: string, userId: string, patch: { title?: string; value?: string; notes?: string | null }): Promise<VaultEntity>
deleteOne(id: string, userId: string): Promise<void>
```

---

## Frontend

### API client (`lib/api.ts`)

```typescript
getVaultEntries(token: string): Promise<VaultEntry[]>
getVaultEntry(id: string, token: string): Promise<VaultEntry>
createVaultEntry(body: CreateVaultEntryRequest, token: string): Promise<VaultEntry>
updateVaultEntry(id: string, body: UpdateVaultEntryRequest, token: string): Promise<VaultEntry>
deleteVaultEntry(id: string, token: string): Promise<void>
```

All methods send `Authorization: Bearer <token>` and throw on non-2xx responses.

### `useVault` hook

```typescript
interface UseVaultResult {
  entries: VaultEntry[];
  loading: boolean;
  error: string | null;
  loadVault(): Promise<void>;
  addEntry(data: CreateVaultEntryRequest): Promise<void>;
  updateEntry(id: string, patch: UpdateVaultEntryRequest): Promise<void>;
  deleteEntry(id: string): Promise<void>;
}
```

- `loadVault` → `GET /vault`, replaces `entries` state.
- `addEntry` → optimistic: appends a placeholder, calls `POST /vault`, replaces placeholder with server response on success, removes on failure.
- `updateEntry` → optimistic: replaces entry in place, calls `PATCH /vault/:id`, restores original on failure.
- `deleteEntry` → optimistic: removes entry from list, calls `DELETE /vault/:id`, re-inserts on failure.
- No encryption/decryption — `cryptoKeyRef` is not used in vault operations.

### VaultPage layout

```
┌────────────────────────────────────────────────────────────┐
│  Sidebar (dark #1A1B26)   │  Main content (light #F5F5F7)  │
│                           │                                 │
│  SafePass                 │  Header: "All Items"  [+ Add]  │
│  Secure Vault             │  Search bar                    │
│                           │                                 │
│  🔑 All Items  ← active   │  Entry list:                   │
│                           │    [icon] title                 │
│  ─────────────────        │           ••••••••              │
│  [avatar] username        │    [copy] [reveal] [edit] [del]│
│  [Lock]                   │                                 │
└───────────────────────────┴─────────────────────────────────┘
```

Modals (centered overlay with backdrop blur) are used for: add entry, detail view, edit entry.

### Color system

| Token     | Value     | Usage                                      |
|-----------|-----------|--------------------------------------------|
| bg        | `#F5F5F7` | Page background, input backgrounds          |
| card      | `#FFFFFF` | Cards, modals, header                       |
| border    | `#E5E7EB` | Input borders, card borders                 |
| text      | `#1A1B26` | Primary text, sidebar background            |
| muted     | `#2F334D` | Secondary text, placeholders, icon buttons  |
| accent    | `#7AA2F7` | Primary actions, active states, links       |
| danger    | `#F7768E` | Destructive actions, error messages         |

### State management

All vault state lives in the `useVault` hook. `VaultPage` manages local UI state:

- `search: string` — filters displayed entries client-side
- `panel: Panel` — controls which modal is open (`none | add | detail | edit`)
- `revealedIds: Set<string>` — tracks which entries have their value revealed
- `mutationError: string | null` — inline error for add/update/delete failures

---

## Sequence Diagrams

### Load vault

```
User          VaultPage            useVault          API
 |                 |                   |               |
 | open vault      |                   |               |
 |───────────────► |── loadVault() ──► |               |
 |                 |                   |── GET /vault ►|
 |                 |                   |◄── entries ── |
 |                 |◄── entries ─────  |               |
 |◄── list shown ─ |                   |               |
```

### Add entry (optimistic)

```
User          VaultPage            useVault          API
 |                 |                   |               |
 | fill form       |                   |               |
 | click Save      |                   |               |
 |───────────────► |── addEntry() ───► |               |
 |                 |                   | append optimistic entry
 |◄── list updated |                   |               |
 |                 |                   |── POST /vault ►|
 |                 |                   |◄── entry ──── |
 |                 |                   | replace with real entry
 |◄── modal closed |                   |               |
```

### Delete entry (optimistic)

```
User          VaultPage            useVault          API
 |                 |                   |               |
 | click Delete    |                   |               |
 |───────────────► |── deleteEntry() ► |               |
 |                 |                   | remove from list
 |◄── entry gone ─ |                   |               |
 |                 |                   |── DELETE /vault/:id ►|
 |                 |                   |◄── 204 ────── |
```

---

## Security Invariants

| Invariant                                        | Where enforced                                             |
|--------------------------------------------------|------------------------------------------------------------|
| All vault endpoints require a valid JWT          | `@UseGuards(JwtAuthGuard)` at controller class level       |
| `userId` comes from the token, never the request | `@CurrentUser()` decorator reads `request.user.userId`     |
| Ownership enforced on every query                | Repository always filters by both `id` and `userId`        |
| Non-owner access returns 404, not 403            | Prevents leaking entry existence to other users            |
| JWT stored in JS memory only                     | React `AuthContext` state — never localStorage or cookies  |
