# API Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manually scaffold the NestJS backend at `apps/api/` with a complete, compilable project structure including TypeORM entities, repository stubs, module/controller/service boilerplate, and migration infrastructure — no business logic, all stubs.

**Architecture:** NestJS monolith with a clear layered structure: controllers → services → repositories → entities. All database access goes through custom repository classes. `synchronize: false` always — schema changes only via TypeORM CLI migrations.

**Tech Stack:** NestJS, TypeORM, PostgreSQL (pg driver), @nestjs/config, @nestjs/jwt, @nestjs/passport, passport-jwt, class-validator, class-transformer, TypeScript.

---

## File Map

| File | Role |
|------|------|
| `apps/api/package.json` | Dependencies + migration scripts |
| `apps/api/tsconfig.json` | TypeScript base config |
| `apps/api/tsconfig.build.json` | Build-only tsconfig (excludes tests) |
| `apps/api/nest-cli.json` | NestJS CLI config |
| `apps/api/.env.example` | Env var documentation |
| `apps/api/src/main.ts` | Bootstrap: global ValidationPipe, `/api` prefix |
| `apps/api/src/app.module.ts` | Root module: ConfigModule, DatabaseModule, AuthModule, VaultModule |
| `apps/api/src/config/app.config.ts` | Typed app config (port, cors origin) |
| `apps/api/src/config/database.config.ts` | TypeORM DataSourceOptions from env |
| `apps/api/src/database/data-source.ts` | Standalone DataSource for TypeORM CLI |
| `apps/api/src/database/database.module.ts` | Imports TypeOrmModule, exports UserRepository + VaultRepository |
| `apps/api/src/database/entities/user.entity.ts` | UserEntity: id, username, salt, passwordHash, timestamps |
| `apps/api/src/database/entities/vault.entity.ts` | VaultEntity: id, userId, title, value, notes, timestamps |
| `apps/api/src/database/repositories/user.repository.ts` | UserRepository extending Repository<UserEntity> |
| `apps/api/src/database/repositories/vault.repository.ts` | VaultRepository extending Repository<VaultEntity> |
| `apps/api/src/modules/auth/auth.module.ts` | AuthModule: imports DatabaseModule, exports AuthService |
| `apps/api/src/modules/auth/auth.controller.ts` | GET /status, GET /salt, POST /setup, POST /unlock |
| `apps/api/src/modules/auth/auth.service.ts` | Stub: getStatus, getSalt, setup, unlock |
| `apps/api/src/modules/auth/dto/setup.dto.ts` | SetupDto: username, salt, passwordHash |
| `apps/api/src/modules/auth/dto/unlock.dto.ts` | UnlockDto: username, passwordHash |
| `apps/api/src/modules/vault/vault.module.ts` | VaultModule: imports DatabaseModule |
| `apps/api/src/modules/vault/vault.controller.ts` | GET /, POST /, PATCH /:id, DELETE /:id |
| `apps/api/src/modules/vault/vault.service.ts` | Stub: findAll, create, update, remove |
| `apps/api/src/modules/vault/dto/create-vault-entry.dto.ts` | CreateVaultEntryDto: title, value, notes |
| `apps/api/src/modules/vault/dto/update-vault-entry.dto.ts` | UpdateVaultEntryDto: title?, value?, notes? |

---

## Task 1: Project Config Files

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@safepass/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:dev": "nest start --watch",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "pg": "^8.11.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0",
    "typeorm": "^0.3.17"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.0.0",
    "@types/passport-jwt": "^4.0.0",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

- [ ] **Step 4: Create `apps/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 5: Create `apps/api/.env.example`**

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=safepass
DB_PASSWORD=safepass_dev
DB_NAME=safepass
JWT_SECRET=change_me
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/api && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/.env.example
git commit -m "chore(api): init project config files"
```

---

## Task 2: Config Module Files

**Files:**
- Create: `apps/api/src/config/app.config.ts`
- Create: `apps/api/src/config/database.config.ts`

- [ ] **Step 1: Create `apps/api/src/config/app.config.ts`**

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}));
```

- [ ] **Step 2: Create `apps/api/src/config/database.config.ts`**

```typescript
import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export default registerAs(
  'database',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'safepass',
    password: process.env.DB_PASSWORD ?? 'safepass_dev',
    database: process.env.DB_NAME ?? 'safepass',
    entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
  }),
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/config/
git commit -m "chore(api): add app and database config"
```

---

## Task 3: Entities

**Files:**
- Create: `apps/api/src/database/entities/user.entity.ts`
- Create: `apps/api/src/database/entities/vault.entity.ts`

- [ ] **Step 1: Create `apps/api/src/database/entities/user.entity.ts`**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VaultEntity } from './vault.entity';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  salt: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @OneToMany(() => VaultEntity, (vault) => vault.user)
  vaults: VaultEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 2: Create `apps/api/src/database/entities/vault.entity.ts`**

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('vault')
export class VaultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.vaults, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/database/entities/
git commit -m "feat(api): add UserEntity and VaultEntity"
```

---

## Task 4: Repositories

**Files:**
- Create: `apps/api/src/database/repositories/user.repository.ts`
- Create: `apps/api/src/database/repositories/vault.repository.ts`

- [ ] **Step 1: Create `apps/api/src/database/repositories/user.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}
}
```

- [ ] **Step 2: Create `apps/api/src/database/repositories/vault.repository.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaultEntity } from '../entities/vault.entity';

@Injectable()
export class VaultRepository {
  constructor(
    @InjectRepository(VaultEntity)
    private readonly repo: Repository<VaultEntity>,
  ) {}
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/database/repositories/
git commit -m "feat(api): add UserRepository and VaultRepository stubs"
```

---

## Task 5: DatabaseModule + data-source.ts

**Files:**
- Create: `apps/api/src/database/database.module.ts`
- Create: `apps/api/src/database/data-source.ts`
- Create: `apps/api/src/database/migrations/.gitkeep`

- [ ] **Step 1: Create `apps/api/src/database/database.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { VaultEntity } from './entities/vault.entity';
import { UserRepository } from './repositories/user.repository';
import { VaultRepository } from './repositories/vault.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<DataSourceOptions>('database'),
    }),
    TypeOrmModule.forFeature([UserEntity, VaultEntity]),
  ],
  providers: [UserRepository, VaultRepository],
  exports: [UserRepository, VaultRepository],
})
export class DatabaseModule {}
```

- [ ] **Step 2: Create `apps/api/src/database/data-source.ts`**

```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'safepass',
  password: process.env.DB_PASSWORD ?? 'safepass_dev',
  database: process.env.DB_NAME ?? 'safepass',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
```

- [ ] **Step 3: Create `apps/api/src/database/migrations/.gitkeep`**

```bash
touch apps/api/src/database/migrations/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/database/
git commit -m "feat(api): add DatabaseModule and TypeORM CLI data-source"
```

---

## Task 6: Auth DTOs

**Files:**
- Create: `apps/api/src/modules/auth/dto/setup.dto.ts`
- Create: `apps/api/src/modules/auth/dto/unlock.dto.ts`

- [ ] **Step 1: Create `apps/api/src/modules/auth/dto/setup.dto.ts`**

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  salt: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;
}
```

- [ ] **Step 2: Create `apps/api/src/modules/auth/dto/unlock.dto.ts`**

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class UnlockDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/dto/
git commit -m "feat(api): add auth DTOs"
```

---

## Task 7: Auth Service + Controller + Module

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Create `apps/api/src/modules/auth/auth.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { SetupDto } from './dto/setup.dto';
import { UnlockDto } from './dto/unlock.dto';

@Injectable()
export class AuthService {
  getStatus(): { initialized: boolean } {
    throw new Error('Not implemented');
  }

  getSalt(): { salt: string } {
    throw new Error('Not implemented');
  }

  setup(dto: SetupDto): { token: string } {
    throw new Error('Not implemented');
  }

  unlock(dto: UnlockDto): { token: string } {
    throw new Error('Not implemented');
  }
}
```

- [ ] **Step 2: Create `apps/api/src/modules/auth/auth.controller.ts`**

```typescript
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SetupDto } from './dto/setup.dto';
import { UnlockDto } from './dto/unlock.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getStatus() {
    return this.authService.getStatus();
  }

  @Get('salt')
  getSalt() {
    return this.authService.getSalt();
  }

  @Post('setup')
  setup(@Body() dto: SetupDto) {
    return this.authService.setup(dto);
  }

  @Post('unlock')
  unlock(@Body() dto: UnlockDto) {
    return this.authService.unlock(dto);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/modules/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/
git commit -m "feat(api): add auth service, controller, module stubs"
```

---

## Task 8: Vault DTOs

**Files:**
- Create: `apps/api/src/modules/vault/dto/create-vault-entry.dto.ts`
- Create: `apps/api/src/modules/vault/dto/update-vault-entry.dto.ts`

- [ ] **Step 1: Create `apps/api/src/modules/vault/dto/create-vault-entry.dto.ts`**

```typescript
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVaultEntryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

- [ ] **Step 2: Create `apps/api/src/modules/vault/dto/update-vault-entry.dto.ts`**

```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateVaultEntryDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/vault/dto/
git commit -m "feat(api): add vault DTOs"
```

---

## Task 9: Vault Service + Controller + Module

**Files:**
- Create: `apps/api/src/modules/vault/vault.service.ts`
- Create: `apps/api/src/modules/vault/vault.controller.ts`
- Create: `apps/api/src/modules/vault/vault.module.ts`

- [ ] **Step 1: Create `apps/api/src/modules/vault/vault.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Injectable()
export class VaultService {
  findAll(userId: string) {
    throw new Error('Not implemented');
  }

  create(userId: string, dto: CreateVaultEntryDto) {
    throw new Error('Not implemented');
  }

  update(userId: string, id: string, dto: UpdateVaultEntryDto) {
    throw new Error('Not implemented');
  }

  remove(userId: string, id: string) {
    throw new Error('Not implemented');
  }
}
```

- [ ] **Step 2: Create `apps/api/src/modules/vault/vault.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { VaultService } from './vault.service';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  findAll() {
    // userId will come from JWT guard once auth is implemented
    return this.vaultService.findAll('placeholder-user-id');
  }

  @Post()
  create(@Body() dto: CreateVaultEntryDto) {
    return this.vaultService.create('placeholder-user-id', dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVaultEntryDto) {
    return this.vaultService.update('placeholder-user-id', id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vaultService.remove('placeholder-user-id', id);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/modules/vault/vault.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  imports: [DatabaseModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/vault/
git commit -m "feat(api): add vault service, controller, module stubs"
```

---

## Task 10: Root App Module + Bootstrap

**Files:**
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/common/decorators/.gitkeep`
- Create: `apps/api/src/common/guards/.gitkeep`
- Create: `apps/api/src/common/interceptors/.gitkeep`
- Create: `apps/api/src/common/filters/.gitkeep`
- Create: `apps/api/src/common/pipes/.gitkeep`
- Create: `apps/api/src/common/dto/.gitkeep`

- [ ] **Step 1: Create `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { VaultModule } from './modules/vault/vault.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    DatabaseModule,
    AuthModule,
    VaultModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Create `apps/api/src/main.ts`**

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
```

- [ ] **Step 3: Create empty common subdirectory placeholders**

```bash
touch apps/api/src/common/decorators/.gitkeep
touch apps/api/src/common/guards/.gitkeep
touch apps/api/src/common/interceptors/.gitkeep
touch apps/api/src/common/filters/.gitkeep
touch apps/api/src/common/pipes/.gitkeep
touch apps/api/src/common/dto/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/main.ts apps/api/src/common/
git commit -m "feat(api): add root AppModule and bootstrap main.ts"
```

---

## Task 11: Verify Build Compiles

- [ ] **Step 1: Run the build**

```bash
cd apps/api && npm run build
```

Expected: `dist/` folder created, no TypeScript errors.

- [ ] **Step 2: Verify `dist/main.js` exists**

```bash
ls apps/api/dist/main.js
```

Expected: file exists.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add apps/api/src/
git commit -m "fix(api): resolve build errors from scaffold"
```

---

## Self-Review Notes

- All spec requirements covered: UserEntity ✓, VaultEntity ✓, UserRepository ✓, VaultRepository ✓, AuthModule ✓, VaultModule ✓, ConfigModule ✓, DatabaseModule ✓, data-source.ts ✓, migration scripts ✓, synchronize:false ✓, common/ dirs ✓
- No placeholders — all code blocks are complete
- Type consistency: `SetupDto`/`UnlockDto` used in both auth.service.ts and auth.controller.ts; `CreateVaultEntryDto`/`UpdateVaultEntryDto` used in both vault.service.ts and vault.controller.ts
- `userId` param in VaultService matches usage in VaultController
- `dotenv` is a transitive dep via NestJS — no need to add explicitly to package.json
