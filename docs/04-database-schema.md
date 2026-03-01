# SafePass — Database Schema

PostgreSQL 16. Three tables. The design prioritizes zero-knowledge: the server stores only opaque encrypted data for the vault.

## Entity Relationship

```
┌──────────┐       ┌──────────┐
│   user   │──1:1──│  vault   │
│          │       └──────────┘
│          │
│          │──1:N──┌──────────┐
└──────────┘       │ category │
                   └──────────┘
```

---

## Tables

### user

Single row ever (single-user app). Stores the salt and verification hash.

| Column        | Type          | Constraints                    | Description                          |
|---------------|---------------|--------------------------------|--------------------------------------|
| id            | UUID          | PK, DEFAULT gen_random_uuid()  | User identifier                      |
| salt          | TEXT          | NOT NULL                       | Random salt for PBKDF2 (base64)      |
| password_hash | TEXT          | NOT NULL                       | SHA-256 hash of derived key (base64) |
| created_at    | TIMESTAMPTZ   | DEFAULT now()                  | Account creation time                |
| updated_at    | TIMESTAMPTZ   | DEFAULT now()                  | Last update time                     |

**Notes:**
- The `password_hash` is NOT a hash of the master password. It's `SHA-256(PBKDF2(password, salt))`. The server never receives the password itself.
- The `salt` is generated client-side and sent during setup. It's public (not secret), but unique per user.

---

### vault

Single row per user. Stores the entire encrypted vault as one blob.

| Column         | Type          | Constraints                    | Description                          |
|----------------|---------------|--------------------------------|--------------------------------------|
| id             | UUID          | PK, DEFAULT gen_random_uuid()  | Vault record identifier              |
| user_id        | UUID          | FK → user.id, UNIQUE, NOT NULL | Owner                                |
| encrypted_data | TEXT          | NOT NULL                       | AES-GCM ciphertext (base64)         |
| iv             | TEXT          | NOT NULL                       | Initialization vector (base64)       |
| updated_at     | TIMESTAMPTZ   | DEFAULT now()                  | Last save time                       |

**Notes:**
- `UNIQUE(user_id)` ensures one vault row per user.
- `encrypted_data` contains the entire vault JSON, encrypted. It can grow to several MB for large vaults (thousands of entries). TEXT type has no practical size limit in PostgreSQL.
- `iv` is 12 bytes (base64 = 16 chars). A new IV is generated for every save operation.

---

### category

Multiple rows per user. Stored in plaintext (organizational metadata).

| Column     | Type          | Constraints                    | Description                    |
|------------|---------------|--------------------------------|--------------------------------|
| id         | UUID          | PK, DEFAULT gen_random_uuid()  | Category identifier            |
| user_id    | UUID          | FK → user.id, NOT NULL         | Owner                          |
| name       | VARCHAR(100)  | NOT NULL                       | Display name                   |
| icon       | VARCHAR(50)   | NULLABLE                       | Lucide icon name (e.g. "key")  |
| sort_order | INT           | DEFAULT 0                      | Display order in sidebar       |
| created_at | TIMESTAMPTZ   | DEFAULT now()                  | Creation time                  |
| updated_at | TIMESTAMPTZ   | DEFAULT now()                  | Last update time               |

**Notes:**
- When a category is deleted, entries referencing it will have their `categoryId` set to `null`. This is handled client-side (update vault entries → re-encrypt → save).
- `icon` uses Lucide icon names since shadcn/ui uses Lucide icons natively.

---

## Decrypted Vault Structure (browser-only)

This is the JSON structure that gets encrypted into the `vault.encrypted_data` blob. It exists **only in browser memory**, never on the server.

```typescript
interface VaultData {
  entries: VaultEntry[];
  version: number;              // Schema version for future migrations
}

interface VaultEntry {
  id: string;                   // UUID, generated client-side
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  categoryId: string | null;    // References category.id
  customFields: CustomField[];
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
}

interface CustomField {
  key: string;                  // e.g. "Security Question"
  value: string;                // e.g. "Mother's maiden name"
}
```

---

## TypeORM Entity Mapping

TypeORM is configured with `synchronize: true` in development (auto-creates tables from entities). In production, migrations would be used instead.

```
Entity class       →  Table name    →  File path
User               →  user          →  apps/server/src/entities/user.entity.ts
Vault              →  vault         →  apps/server/src/entities/vault.entity.ts
Category           →  category      →  apps/server/src/entities/category.entity.ts
```

Column naming: TypeORM auto-converts camelCase properties to snake_case column names (e.g., `passwordHash` → `password_hash`, `userId` → `user_id`).

---

## Why a Single Encrypted Blob?

**Alternative considered**: One database row per vault entry, with each field encrypted individually.

**Why we chose the blob approach**:

| Concern            | Per-row approach                    | Single blob approach              |
|--------------------|-------------------------------------|-----------------------------------|
| Metadata leakage   | Server knows entry count, timestamps| Server sees only "vault updated"  |
| Query ability      | Can filter/sort server-side         | All filtering is client-side      |
| Performance        | Efficient for large vaults          | Re-encrypts everything per save   |
| Simplicity         | More endpoints, more logic          | Two endpoints: GET and PUT        |

For a single-user local app with < 10,000 entries, the blob approach is simpler and more private. The entire vault serialized is typically < 1MB.
