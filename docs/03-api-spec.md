# SafePass — API Specification

Base URL: `http://localhost:3000/api`

All request/response bodies are JSON. All endpoints return standard error format on failure:
```json
{ "statusCode": 400, "message": "Error description", "error": "Bad Request" }
```

---

## Auth Endpoints

Auth endpoints are **public** (no JWT required).

### GET /api/auth/status

Check if the app has been initialized (master password set).

**Response 200:**
```json
{ "initialized": true }
```

Use this on app load to decide: redirect to `/setup` (false) or `/unlock` (true).

---

### GET /api/auth/salt

Get the stored salt for key derivation. Only available after setup.

**Response 200:**
```json
{ "salt": "base64-encoded-salt-string" }
```

**Response 404:** App not initialized yet.

---

### POST /api/auth/setup

One-time setup. Creates the user with salt and password hash. Fails if user already exists.

**Request:**
```json
{
  "salt": "base64-encoded-16-byte-salt",
  "passwordHash": "base64-encoded-sha256-hash"
}
```

**Response 201:**
```json
{ "token": "jwt-token-string" }
```

**Response 409:** User already exists (setup already completed).

---

### POST /api/auth/unlock

Authenticate with master password hash. Returns JWT on success.

**Request:**
```json
{
  "passwordHash": "base64-encoded-sha256-hash"
}
```

**Response 200:**
```json
{ "token": "jwt-token-string" }
```

**Response 401:** Invalid password (hash mismatch).

**Response 404:** App not initialized yet.

---

## Vault Endpoints

All vault endpoints require `Authorization: Bearer <jwt-token>` header.

### GET /api/vault

Retrieve the encrypted vault blob.

**Response 200:**
```json
{
  "encryptedData": "base64-encoded-aes-gcm-ciphertext",
  "iv": "base64-encoded-12-byte-iv",
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

**Response 200 (empty vault):**
```json
null
```

Returned when setup is complete but no vault has been saved yet.

---

### PUT /api/vault

Save the encrypted vault blob. Overwrites the previous version entirely.

**Request:**
```json
{
  "encryptedData": "base64-encoded-aes-gcm-ciphertext",
  "iv": "base64-encoded-12-byte-iv"
}
```

**Response 200:**
```json
{
  "success": true,
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

---

## Category Endpoints

All category endpoints require `Authorization: Bearer <jwt-token>` header.

Categories are stored in plaintext (they are organizational metadata, not secrets).

### GET /api/categories

List all categories for the user, ordered by `sortOrder`.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Work",
    "icon": "briefcase",
    "sortOrder": 0,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z"
  },
  {
    "id": "uuid",
    "name": "Personal",
    "icon": "user",
    "sortOrder": 1,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z"
  }
]
```

---

### POST /api/categories

Create a new category.

**Request:**
```json
{
  "name": "Finance",
  "icon": "dollar-sign"
}
```

`icon` is optional. It maps to a Lucide icon name used by shadcn/ui.

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Finance",
  "icon": "dollar-sign",
  "sortOrder": 2,
  "createdAt": "2026-03-01T12:00:00.000Z",
  "updatedAt": "2026-03-01T12:00:00.000Z"
}
```

---

### PATCH /api/categories/:id

Update a category. All fields are optional.

**Request:**
```json
{
  "name": "Banking",
  "icon": "landmark",
  "sortOrder": 0
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Banking",
  "icon": "landmark",
  "sortOrder": 0,
  "createdAt": "2026-03-01T12:00:00.000Z",
  "updatedAt": "2026-03-01T12:05:00.000Z"
}
```

**Response 404:** Category not found.

---

### DELETE /api/categories/:id

Delete a category. Entries in this category will have their `categoryId` set to `null` (handled client-side before saving the vault blob).

**Response 200:**
```json
{ "success": true }
```

**Response 404:** Category not found.

---

## JWT Details

- **Algorithm**: HS256
- **Payload**: `{ sub: "user-uuid", iat: timestamp }`
- **Expiry**: 24 hours (generous, since this is local-only)
- **Storage**: In-memory JavaScript variable (not localStorage or cookies)
- **Secret**: From `JWT_SECRET` environment variable

## Error Codes Summary

| Status | Meaning                           | When                                    |
|--------|-----------------------------------|-----------------------------------------|
| 200    | Success                           | Standard successful response            |
| 201    | Created                           | POST /setup, POST /categories           |
| 400    | Bad Request                       | Validation error (missing/invalid data) |
| 401    | Unauthorized                      | Invalid JWT or wrong password hash      |
| 404    | Not Found                         | Resource doesn't exist                  |
| 409    | Conflict                          | POST /setup when user already exists    |

## CORS Configuration

The NestJS server enables CORS for `http://localhost:5173` only (the Vite dev server).

```typescript
// main.ts
app.enableCors({ origin: 'http://localhost:5173' });
```
