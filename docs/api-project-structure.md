# API Project Structure

## Folder Structure

```
apps/api/src/
├── main.ts                              # Bootstrap, CORS, global pipes, prefix
├── app.module.ts                        # Root module, imports all feature modules
│
├── common/                              # Shared across all modules
│   ├── decorators/                      # Custom decorators
│   ├── guards/                          # JWT guard, etc.
│   ├── interceptors/                    # Response transform, logging
│   ├── filters/                         # Exception filters
│   ├── pipes/                           # Validation pipes
│   └── dto/                             # Shared DTOs
│
├── config/                              # Environment and app configuration
│   ├── app.config.ts                    # Port, CORS, JWT settings
│   └── database.config.ts              # TypeORM datasource config
│
├── database/                            # All database concerns
│   ├── database.module.ts               # Exports all repositories
│   ├── entities/                        # TypeORM entity definitions
│   │   ├── user.entity.ts
│   │   ├── vault.entity.ts
│   │   └── category.entity.ts
│   ├── repositories/                    # Custom repository classes
│   │   ├── user.repository.ts
│   │   ├── vault.repository.ts
│   │   └── category.repository.ts
│   └── migrations/                      # All migration files
│       └── <timestamp>-<description>.ts
│
└── modules/                             # Feature modules
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── dto/
    │
    ├── vault/
    │   ├── vault.module.ts
    │   ├── vault.controller.ts
    │   ├── vault.service.ts
    │   └── dto/
    │
    └── categories/
        ├── categories.module.ts
        ├── categories.controller.ts
        ├── categories.service.ts
        └── dto/
```

## Architectural Rules

### Dependency Direction

```
Controller → Service → Repository → Entity
     ↓           ↓
    DTO        Entity
```

- **Controllers** handle HTTP concerns only: routing, status codes, request/response shape. No business logic.
- **Services** contain all business logic. They depend on repositories, never on controllers.
- **Repositories** encapsulate all database queries. Services never call TypeORM `Repository<Entity>` directly.
- **Entities** are pure data models. They don't import services, repositories, or controllers.
- **DTOs** are plain classes with `class-validator` decorators. Used at the controller layer for input validation.

### Module Boundaries

- Each feature module is self-contained — owns its controller, service, and DTOs.
- All entities and repositories live in the shared `database/` folder, exported via `DatabaseModule`.
- Feature modules import `DatabaseModule` to access repositories.
- Modules communicate through NestJS dependency injection (`exports`/`imports`), never by importing files directly from another module's folder.
- Shared code lives in `common/` only if used by 2+ modules. Don't preemptively abstract.

## Naming Conventions

| Type | File naming | Class naming | Example |
|------|------------|-------------|---------|
| Module | `<feature>.module.ts` | `<Feature>Module` | `auth.module.ts` → `AuthModule` |
| Controller | `<feature>.controller.ts` | `<Feature>Controller` | `auth.controller.ts` → `AuthController` |
| Service | `<feature>.service.ts` | `<Feature>Service` | `auth.service.ts` → `AuthService` |
| Entity | `<name>.entity.ts` | `<Name>Entity` | `user.entity.ts` → `UserEntity` |
| Repository | `<name>.repository.ts` | `<Name>Repository` | `user.repository.ts` → `UserRepository` |
| DTO | `<action>-<name>.dto.ts` | `<Action><Name>Dto` | `create-category.dto.ts` → `CreateCategoryDto` |
| Guard | `<name>.guard.ts` | `<Name>Guard` | `jwt.guard.ts` → `JwtGuard` |
| Filter | `<name>.filter.ts` | `<Name>Filter` | `http-exception.filter.ts` → `HttpExceptionFilter` |
| Interceptor | `<name>.interceptor.ts` | `<Name>Interceptor` | `transform.interceptor.ts` → `TransformInterceptor` |
| Decorator | `<name>.decorator.ts` | function `<name>()` | `current-user.decorator.ts` → `CurrentUser()` |
| Pipe | `<name>.pipe.ts` | `<Name>Pipe` | `parse-uuid.pipe.ts` → `ParseUuidPipe` |

### General Rules

- Files: kebab-case (`create-category.dto.ts`)
- Classes: PascalCase (`CreateCategoryDto`)
- Properties/variables: camelCase (`passwordHash`)
- Database columns: auto snake_case via TypeORM (`password_hash`)

## Database Conventions

### Entity Rules

- All entities use `@Entity('<table_name>')` with explicit table name
- UUID primary key: `@PrimaryGeneratedColumn('uuid')`
- Every entity has `createdAt` and `updatedAt` via `@CreateDateColumn()` and `@UpdateDateColumn()`
- Column types are explicit: `@Column({ type: 'varchar', length: 255 })`
- Relations use decorators with explicit `onDelete` behavior

### Table and Column Conventions

- Table names: singular, snake_case, no suffix (`user`, `vault`, `category`)
- Column names: snake_case (auto-converted from camelCase entity properties)
- Foreign keys: `<referenced_table>_id` (e.g., `user_id`)

### Migrations

- **All** schema changes go through migration files — no `synchronize`
- This includes: tables, columns, indexes, views, constraints, seeds
- Migration files live in `apps/api/src/database/migrations/`
- Naming: `<timestamp>-<description>.ts` (e.g., `1712000000000-create-user-table.ts`)
- Generated via TypeORM CLI, never hand-written from scratch
- Every migration must have both `up()` and `down()` methods

## Environment and Config

- Environment variables defined in `.env` at project root (git-ignored)
- Loaded via NestJS `@nestjs/config` module (`ConfigModule.forRoot()`)
- Accessed through `ConfigService` injection — never `process.env` directly in services
- Config files live in `config/`: `app.config.ts` for app settings, `database.config.ts` for TypeORM
- All required env vars validated at startup — app fails fast if missing
