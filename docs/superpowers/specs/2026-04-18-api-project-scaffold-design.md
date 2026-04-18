# API Project Scaffold Design

Date: 2026-04-18

## Goal

Manually scaffold the NestJS backend at `apps/api/` with a complete, compilable project structure — all folders, TypeORM entities, repository stubs, module/controller/service boilerplate, and migration infrastructure. No business logic yet; every service method is a stub. `synchronize` is always `false`; all schema changes go through migrations.

## Folder Structure

```
apps/api/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .env.example
│
└── src/
    ├── main.ts                          # Bootstrap: global pipes, /api prefix (no hardcoded CORS)
    ├── app.module.ts                    # Root module — imports all feature + config modules
    │
    ├── common/
    │   ├── decorators/                  # Empty — populated per feature
    │   ├── guards/                      # Empty — populated per feature
    │   ├── interceptors/                # Empty — populated per feature
    │   ├── filters/                     # Empty — populated per feature
    │   ├── pipes/                       # Empty — populated per feature
    │   └── dto/                         # Empty — populated per feature
    │
    ├── config/
    │   ├── app.config.ts                # Port, CORS origin from env
    │   └── database.config.ts           # TypeORM DataSourceOptions from env
    │
    ├── database/
    │   ├── data-source.ts               # Standalone DataSource for TypeORM CLI
    │   ├── database.module.ts           # Exports all repositories via TypeOrmModule
    │   ├── entities/
    │   │   ├── user.entity.ts           # user table: id, salt, password_hash, timestamps
    │   │   ├── vault.entity.ts          # vault table: id, user_id (UNIQUE), encrypted_data, iv, updated_at
    │   │   └── category.entity.ts       # category table: id, user_id, name, icon, sort_order, timestamps
    │   ├── repositories/
    │   │   ├── user.repository.ts       # Extends Repository<UserEntity>
    │   │   ├── vault.repository.ts      # Extends Repository<VaultEntity>
    │   │   └── category.repository.ts   # Extends Repository<CategoryEntity>
    │   └── migrations/                  # Empty dir — populated by TypeORM CLI
    │
    └── modules/
        ├── auth/
        │   ├── auth.module.ts
        │   ├── auth.controller.ts       # GET /status, GET /salt, POST /setup, POST /unlock
        │   ├── auth.service.ts          # Stub methods
        │   └── dto/                     # SetupDto, UnlockDto
        ├── vault/
        │   ├── vault.module.ts
        │   ├── vault.controller.ts      # GET /vault, PUT /vault
        │   ├── vault.service.ts         # Stub methods
        │   └── dto/                     # SaveVaultDto
        └── categories/
            ├── categories.module.ts
            ├── categories.controller.ts # GET, POST, PATCH /:id, DELETE /:id
            ├── categories.service.ts    # Stub methods
            └── dto/                     # CreateCategoryDto, UpdateCategoryDto
```

## Entities

### UserEntity (`user` table)
- `id`: UUID PK
- `salt`: varchar(255) NOT NULL — base64 PBKDF2 salt
- `passwordHash`: varchar(255) NOT NULL — SHA-256 of derived key (base64)
- `createdAt`: timestamptz
- `updatedAt`: timestamptz

### VaultEntity (`vault` table)
- `id`: UUID PK
- `userId`: UUID FK → user.id, UNIQUE, onDelete CASCADE
- `encryptedData`: text NOT NULL
- `iv`: varchar(255) NOT NULL
- `updatedAt`: timestamptz

### CategoryEntity (`category` table)
- `id`: UUID PK
- `userId`: UUID FK → user.id, onDelete CASCADE
- `name`: varchar(100) NOT NULL
- `icon`: varchar(50) NULLABLE
- `sortOrder`: int DEFAULT 0
- `createdAt`: timestamptz
- `updatedAt`: timestamptz

## TypeORM Config

- `synchronize: false` always — no exceptions
- `data-source.ts` exports a `DataSource` instance used by TypeORM CLI scripts
- Migration scripts in `package.json`:
  - `migration:generate` — generates migration from entity diff
  - `migration:run` — applies pending migrations
  - `migration:revert` — reverts last migration

## Dependencies

### Runtime
- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
- `@nestjs/typeorm`, `typeorm`, `pg`
- `@nestjs/config`
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
- `class-validator`, `class-transformer`
- `reflect-metadata`, `rxjs`

### Dev
- `@nestjs/cli`, `@nestjs/testing`
- `@types/node`, `@types/passport-jwt`
- `typescript`, `ts-node`, `ts-jest`

## Environment Variables

`.env.example`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=safepass
DB_PASSWORD=safepass_dev
DB_NAME=safepass
JWT_SECRET=change_me
PORT=3000
```

## Key Decisions

- CORS origin is read from env/config, not hardcoded in `main.ts`
- Repositories extend `Repository<Entity>` using `@InjectRepository()` — services never call TypeORM directly
- `common/` folders are created empty — only populated when 2+ modules need shared code
- `migrations/` directory is created but empty — first migration generated after entities are finalized
