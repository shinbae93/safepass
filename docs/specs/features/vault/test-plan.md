# Vault Feature — Test Plan

## Scope

Covers the vault CRUD API (backend unit + integration), the `useVault` hook (unit), and the VaultPage UI (acceptance scenarios).

---

## Backend — VaultService (unit)

All tests use a mocked `VaultRepository`.

### `findAll`

| # | Given | When | Then |
|---|-------|------|------|
| S1 | User has 3 entries | `findAll(userId)` called | Returns array of 3 `VaultEntity` objects |
| S2 | User has no entries | `findAll(userId)` called | Returns empty array |

### `findOne`

| # | Given | When | Then |
|---|-------|------|------|
| S3 | Entry exists and belongs to user | `findOne(id, userId)` called | Returns the entry |
| S4 | Entry does not exist | `findOne(id, userId)` called | Throws `NotFoundException` |
| S5 | Entry exists but belongs to a different user | `findOne(id, userId)` called | Throws `NotFoundException` |

### `create`

| # | Given | When | Then |
|---|-------|------|------|
| S6 | Valid title, value, and notes | `create(userId, data)` called | Returns saved `VaultEntity` with correct fields |
| S7 | No notes provided | `create(userId, data)` called | Returns entry with `notes: null` |

### `update`

| # | Given | When | Then |
|---|-------|------|------|
| S8 | Entry exists and belongs to user | `update(id, userId, patch)` called | Returns updated entry |
| S9 | Entry does not exist | `update(id, userId, patch)` called | Throws `NotFoundException` |

### `remove`

| # | Given | When | Then |
|---|-------|------|------|
| S10 | Entry exists and belongs to user | `remove(id, userId)` called | Resolves without error |
| S11 | Entry does not exist | `remove(id, userId)` called | Throws `NotFoundException` |

---

## Backend — VaultController (integration / e2e)

These scenarios require a running NestJS app with a real database (or in-memory equivalent).

### Authorization

| # | Given | When | Then |
|---|-------|------|------|
| C1 | No token | Any vault endpoint called | 401 Unauthorized |
| C2 | Expired token | Any vault endpoint called | 401 Unauthorized |
| C3 | Valid token | `GET /vault` | 200 with user's entries |

### `GET /vault`

| # | Given | When | Then |
|---|-------|------|------|
| C4 | User has 2 entries | `GET /vault` | 200 with array of 2 entries |
| C5 | User has no entries | `GET /vault` | 200 with `[]` |

### `GET /vault/:id`

| # | Given | When | Then |
|---|-------|------|------|
| C6 | Entry belongs to user | `GET /vault/:id` | 200 with entry |
| C7 | Entry does not exist | `GET /vault/:id` | 404 |
| C8 | Entry belongs to a different user | `GET /vault/:id` | 404 |

### `POST /vault`

| # | Given | When | Then |
|---|-------|------|------|
| C9 | Valid body `{ title, value }` | `POST /vault` | 201 with created entry |
| C10 | Valid body with notes | `POST /vault` | 201 with notes in response |
| C11 | Missing `title` | `POST /vault` | 400 |
| C12 | Missing `value` | `POST /vault` | 400 |

### `PATCH /vault/:id`

| # | Given | When | Then |
|---|-------|------|------|
| C13 | Partial patch `{ title }` | `PATCH /vault/:id` | 200 with updated title, other fields unchanged |
| C14 | Patch `{ notes: null }` | `PATCH /vault/:id` | 200 with `notes: null` |
| C15 | Entry does not exist | `PATCH /vault/:id` | 404 |
| C16 | Entry belongs to different user | `PATCH /vault/:id` | 404 |

### `DELETE /vault/:id`

| # | Given | When | Then |
|---|-------|------|------|
| C17 | Entry exists and belongs to user | `DELETE /vault/:id` | 204 No Content |
| C18 | Entry does not exist | `DELETE /vault/:id` | 404 |
| C19 | Entry belongs to different user | `DELETE /vault/:id` | 404 |

---

## Frontend — `useVault` hook (unit)

Tests mock `api.*` methods and wrap the hook in a test `AuthContext` that provides a token.

### `loadVault`

| # | Given | When | Then |
|---|-------|------|------|
| H1 | API returns 2 entries | `loadVault()` called | `entries` equals the 2 entries; `loading` becomes false |
| H2 | API throws | `loadVault()` called | `error` is set; `entries` remains `[]` |

### `addEntry` (optimistic)

| # | Given | When | Then |
|---|-------|------|------|
| H3 | API succeeds | `addEntry(data)` called | New entry appears in `entries`; `POST /vault` was called once |
| H4 | API throws | `addEntry(data)` called | `entries` is rolled back to pre-call state |

### `updateEntry` (optimistic)

| # | Given | When | Then |
|---|-------|------|------|
| H5 | API succeeds | `updateEntry(id, patch)` called | Entry in `entries` is updated |
| H6 | API throws | `updateEntry(id, patch)` called | `entries` is rolled back |

### `deleteEntry` (optimistic)

| # | Given | When | Then |
|---|-------|------|------|
| H7 | API succeeds | `deleteEntry(id)` called | Entry removed from `entries` |
| H8 | API throws | `deleteEntry(id)` called | Entry is re-inserted into `entries` |

---

## Frontend — VaultPage (acceptance / manual)

These are end-to-end UI scenarios verified in the running Electron app.

### Vault list

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| U1 | Load with entries | Log in; open vault | All entries are listed with titles and `••••••••` masks |
| U2 | Empty vault | Log in with a fresh account | Empty state message is shown |
| U3 | Search | Type partial title in search bar | List filters in real time |
| U4 | Reveal value | Click the reveal icon on an entry row | Value switches from `••••••••` to plaintext |
| U5 | Hide again | Click reveal icon a second time | Value returns to `••••••••` |
| U6 | Copy | Click copy icon on an entry | Clipboard contains the plaintext value |

### Add entry

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| U7 | Open form | Click "+ Add New Item" | Modal opens with empty title, value, notes fields |
| U8 | Show/hide in form | Click show toggle in value field | Value field switches between `password` and `text` type |
| U9 | Submit valid | Fill title + value; click Save | Modal closes; new entry appears in list |
| U10 | Submit missing title | Leave title empty; click Save | Form does not submit (required field validation) |
| U11 | Cancel | Open modal; click Cancel | Modal closes; no entry is added |

### Detail view

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| U12 | Open detail | Click an entry row | Modal shows title, `••••••••`, notes, and creation date |
| U13 | Reveal in detail | Click Show | Value revealed |
| U14 | Copy from detail | Click Copy | Clipboard contains value |
| U15 | Close | Click × button | Modal closes |

### Edit entry

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| U16 | Open edit | Click Edit in detail panel | Edit modal opens pre-filled with current data |
| U17 | Save change | Modify title; click Save | Updated title appears in list and detail view |
| U18 | Cancel edit | Click Cancel | Returns to detail view with original data |

### Delete entry

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| U19 | Delete from detail | Click Delete in detail panel | Entry removed from list; detail panel closes |
| U20 | Delete from row | Click delete icon on entry row | Entry removed from list |

### Authorization

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| U21 | Session expired | Allow JWT to expire; try any vault action | API returns 401; app redirects to login |
| U22 | Lock vault | Click Lock in sidebar | Redirected to login; vault data no longer in memory |
