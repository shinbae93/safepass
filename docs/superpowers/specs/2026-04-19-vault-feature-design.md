# Vault Feature Design

Date: 2026-04-19

## Overview

Implement the vault feature end-to-end: a JWT-guarded backend API that stores per-entry encrypted vault rows, and a frontend with full CRUD, search, and entry detail/edit UI.

Architecture choice: **hybrid model** — the server stores individual rows per entry (knows entry count but not content values). The `value` field is stored as plaintext on the server in this implementation; the server is a structured store. Full zero-knowledge encryption is out of scope for this feature.

Approach: backend first (JWT guard + API), then frontend.

---

## Data Model

### VaultEntry (shared shape)

| Field     | Type              | Notes                        |
|-----------|-------------------|------------------------------|
| id        | uuid              | PK, server-generated         |
| userId    | uuid              | FK → user, CASCADE delete    |
| title     | text              | not null                     |
| value     | text              | not null, stored as-is       |
| notes     | text \| null      | optional                     |
| createdAt | timestamp         | auto                         |
| updatedAt | timestamp         | auto                         |

No `categoryId`. The existing `VaultEntity` already matches — no migration needed beyond confirming the table shape.

### Frontend TypeScript type

```ts
interface VaultEntry {
  id: string;
  title: string;
  value: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Backend

### JWT Guard

- Add `@nestjs/passport` + `passport-jwt` dependencies
- Implement `JwtStrategy` (extracts `sub` as `userId` from token payload)
- Implement `JwtAuthGuard` extending `AuthGuard('jwt')`
- Apply `@UseGuards(JwtAuthGuard)` to all vault controller methods
- Attach `userId` to the request via the passport strategy

### Vault API

Base path: `/api/vault`. All endpoints require valid JWT.

| Method | Path        | Request body                          | Response         | Errors        |
|--------|-------------|---------------------------------------|------------------|---------------|
| GET    | /vault      | —                                     | VaultEntry[]     | 401           |
| GET    | /vault/:id  | —                                     | VaultEntry       | 401, 404      |
| POST   | /vault      | { title, value, notes? }              | VaultEntry (201) | 401, 400      |
| PATCH  | /vault/:id  | { title?, value?, notes? }            | VaultEntry       | 401, 404, 400 |
| DELETE | /vault/:id  | —                                     | 204 No Content   | 401, 404      |

Ownership enforced on every operation: service always filters/checks by both `id` and `userId`.

### VaultRepository methods

```
findAllByUser(userId: string): Promise<VaultEntity[]>
findOneByUser(id: string, userId: string): Promise<VaultEntity | null>
create(userId: string, data: { title, value, notes? }): Promise<VaultEntity>
update(id: string, userId: string, patch: { title?, value?, notes? }): Promise<VaultEntity>
deleteOne(id: string, userId: string): Promise<void>
```

### VaultService

Thin layer over repository. Throws `NotFoundException` when `findOneByUser` returns null.

### VaultModule

Imports `AuthModule` (which must export `JwtModule`) and `DatabaseModule`. The JWT guard is provided via `JwtAuthGuard` registered in the module or applied directly in the controller.

---

## Frontend

### api.ts additions

```ts
getVaultEntries(token: string): Promise<VaultEntry[]>
getVaultEntry(id: string, token: string): Promise<VaultEntry>
createVaultEntry(body: { title: string; value: string; notes?: string }, token: string): Promise<VaultEntry>
updateVaultEntry(id: string, body: Partial<{ title: string; value: string; notes: string | null }>, token: string): Promise<VaultEntry>
deleteVaultEntry(id: string, token: string): Promise<void>
```

### useVault hook

Replace blob-encrypt approach with direct per-entry API calls. Same public interface:

```ts
{ entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry }
```

- `loadVault` → `GET /vault`
- `addEntry` → `POST /vault`, optimistic update with rollback on failure
- `updateEntry` → `PATCH /vault/:id`, optimistic update with rollback
- `deleteEntry` → `DELETE /vault/:id`, optimistic update with rollback
- Remove all `encrypt`/`decrypt` calls and `cryptoKeyRef` usage from vault logic

### VaultPage — list view

- Search bar filters entries by title client-side
- Entry row: title, notes (truncated), `••••••••` with show/hide toggle, "Copy" button, Edit and Delete actions
- "+ Add Entry" opens an inline form (title, value, notes fields)
- Loading and error states displayed

### Entry detail / edit

- Clicking an entry opens a detail panel (modal or slide-over)
- Detail view: all fields shown, value hidden by default with toggle
- "Edit" button switches the panel to edit mode (fields become inputs)
- Save calls `updateEntry`; Cancel reverts to detail view
- Delete from detail panel calls `deleteEntry` and closes panel

### VaultEntry type

Remove `categoryId` from `apps/desktop-app/src/renderer/src/types/index.ts`.

---

## Files Changed

### Backend (apps/api)
- `src/modules/auth/jwt.strategy.ts` — new
- `src/modules/auth/jwt-auth.guard.ts` — new
- `src/modules/auth/auth.module.ts` — export JwtModule
- `src/modules/vault/vault.controller.ts` — replace with JWT-guarded CRUD
- `src/modules/vault/vault.service.ts` — implement all methods
- `src/modules/vault/vault.module.ts` — import AuthModule
- `src/modules/vault/dto/create-vault-entry.dto.ts` — title, value, notes?
- `src/modules/vault/dto/update-vault-entry.dto.ts` — all optional
- `src/database/repositories/vault.repository.ts` — implement all methods
- `src/database/entities/vault.entity.ts` — confirm shape (no changes expected)

### Frontend (apps/desktop-app)
- `src/types/index.ts` — remove categoryId from VaultEntry
- `src/lib/api.ts` — add 5 vault methods
- `src/hooks/useVault.ts` — rewrite to use API, drop crypto
- `src/pages/VaultPage.tsx` — search, list with reveal/copy, detail/edit panel

### Docs
- `CLAUDE.md` — update architecture section to reflect hybrid model

---

## Out of Scope

- Categories
- Bulk operations
- Export / import
- Pagination (assume entry count is small for a personal password manager)
