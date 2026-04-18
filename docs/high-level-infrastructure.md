# High-Level Infrastructure

## System Architecture

```
                         ┌─────────────────── Docker Compose ───────────────────┐
                         │                                                      │
                         │  ┌──────────────┐  REST API    ┌──────────────┐      │
 ┌───────┐    HTTP       │  │    Client    │  HTTP :3000  │     API      │      │
 │ Users │──────────────►│  │  React/Vite  │─────────────►│   NestJS     │      │
 └───────┘   :5173       │  │    :5173     │  JSON + JWT  │    :3000     │      │
                         │  └──────────────┘              └──────┬───────┘      │
                         │                                       │              │
                         │                                TypeORM│TCP :5432     │
                         │                                       │              │
                         │                                ┌──────▼───────┐      │
                         │                                │  PostgreSQL  │      │
                         │                                │    :5432     │      │
                         │                                └──────────────┘      │
                         │                                                      │
                         └──────────────────────────────────────────────────────┘
```

## Communication

| From   | To         | Protocol | Port | Details                                                                                       |
| ------ | ---------- | -------- | ---- | --------------------------------------------------------------------------------------------- |
| Users  | Client     | HTTP     | 5173 | Browser loads the React SPA                                                                   |
| Client | API        | HTTP     | 3000 | REST API calls with JSON payloads. JWT in `Authorization: Bearer` header for protected routes |
| API    | PostgreSQL | TCP      | 5432 | TypeORM manages connection pool and queries                                                   |

## CORS Policy

The API accepts requests only from the Client origin (`http://localhost:5173`). All other origins are rejected.

## Data Boundary

```
 ┌──────────────────────────────┐       ┌──────────────────────────────┐
 │     Browser (trusted zone)   │       │   Server (untrusted zone)    │
 │                              │       │                              │
 │  ● Master Password           │       │  ● Salt                      │
 │  ● CryptoKey (derived)       │       │  ● Password Hash             │
 │  ● Decrypted Vault           │       │  ● Encrypted Blob + IV       │
 │                              │       │                              │
 └──────────────────────────────┘       └──────────────────────────────┘
                 │
                 └──── never crosses ──── ✕
```

The master password, derived encryption key, and decrypted vault data never leave the browser. The server only stores opaque encrypted data it cannot read.
