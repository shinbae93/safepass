# Vault Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full vault CRUD — JWT-guarded API on the backend storing per-entry rows, and a polished frontend with search, reveal/copy, and entry detail/edit.

**Architecture:** Backend-first. JWT guard extracts `userId` from token; vault service enforces ownership on every operation. Frontend rewrites `useVault` to call per-entry endpoints directly (no blob encryption), and upgrades `VaultPage` with search, reveal toggle, copy, and a detail/edit panel.

**Tech Stack:** NestJS + TypeORM + passport-jwt (backend), React 18 + TypeScript + Tailwind CSS + shadcn/ui (frontend), Electron desktop app at `apps/desktop-app`.

---

## File Map

### New files
- `apps/api/src/modules/auth/jwt.strategy.ts` — Passport JWT strategy
- `apps/api/src/modules/auth/jwt-auth.guard.ts` — NestJS guard wrapping the strategy
- `apps/api/src/modules/auth/decorators/current-user.decorator.ts` — `@CurrentUser()` param decorator
- `apps/api/src/modules/vault/vault.service.spec.ts` — VaultService unit tests

### Modified files
- `apps/api/src/modules/auth/auth.module.ts` — export `JwtModule` and new guard/strategy
- `apps/api/src/modules/vault/vault.module.ts` — import `AuthModule`
- `apps/api/src/modules/vault/vault.controller.ts` — replace with JWT-guarded CRUD (5 endpoints)
- `apps/api/src/modules/vault/vault.service.ts` — implement all methods
- `apps/api/src/modules/vault/dto/create-vault-entry.dto.ts` — already correct, no change needed
- `apps/api/src/modules/vault/dto/update-vault-entry.dto.ts` — already correct, no change needed
- `apps/api/src/database/repositories/vault.repository.ts` — implement all query methods
- `apps/desktop-app/src/renderer/src/types/index.ts` — remove `categoryId` from `VaultEntry`, update `VaultResponse`/`VaultUpdateRequest`
- `apps/desktop-app/src/renderer/src/lib/api.ts` — add 5 vault methods, remove old blob methods
- `apps/desktop-app/src/renderer/src/hooks/useVault.ts` — rewrite to per-entry API calls
- `apps/desktop-app/src/renderer/src/pages/VaultPage.tsx` — full UI rewrite
- `CLAUDE.md` — update architecture section to reflect hybrid model

---

## Task 1: JWT Strategy and Guard

**Files:**
- Create: `apps/api/src/modules/auth/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Create JWT strategy**

Create `apps/api/src/modules/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtSecret', 'dev_jwt_secret_change_me'),
    });
  }

  validate(payload: { sub: string }): { userId: string } {
    return { userId: payload.sub };
  }
}
```

- [ ] **Step 2: Create JWT auth guard**

Create `apps/api/src/modules/auth/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 3: Create CurrentUser decorator**

Create `apps/api/src/modules/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): { userId: string } => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 4: Export strategy and guard from AuthModule**

Replace `apps/api/src/modules/auth/auth.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret', 'dev_jwt_secret_change_me'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 5: Compile check**

```bash
cd apps/api && pnpm build
```

Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/
git commit -m "feat(api): add JWT guard, strategy, and CurrentUser decorator"
```

---

## Task 2: VaultRepository Methods

**Files:**
- Modify: `apps/api/src/database/repositories/vault.repository.ts`

- [ ] **Step 1: Implement all repository methods**

Replace `apps/api/src/database/repositories/vault.repository.ts` with:

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

  findAllByUser(userId: string): Promise<VaultEntity[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  findOneByUser(id: string, userId: string): Promise<VaultEntity | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  async create(
    userId: string,
    data: { title: string; value: string; notes?: string },
  ): Promise<VaultEntity> {
    const entity = this.repo.create({ userId, ...data });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    userId: string,
    patch: { title?: string; value?: string; notes?: string | null },
  ): Promise<VaultEntity> {
    await this.repo.update({ id, userId }, patch);
    return this.repo.findOne({ where: { id, userId } });
  }

  async deleteOne(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }
}
```

- [ ] **Step 2: Compile check**

```bash
cd apps/api && pnpm build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/database/repositories/vault.repository.ts
git commit -m "feat(api): implement VaultRepository CRUD methods"
```

---

## Task 3: VaultService with Tests

**Files:**
- Modify: `apps/api/src/modules/vault/vault.service.ts`
- Create: `apps/api/src/modules/vault/vault.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/vault/vault.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { VaultRepository } from '../../database/repositories/vault.repository';

const mockVaultRepo = {
  findAllByUser: jest.fn(),
  findOneByUser: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteOne: jest.fn(),
};

describe('VaultService', () => {
  let service: VaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        { provide: VaultRepository, useValue: mockVaultRepo },
      ],
    }).compile();
    service = module.get<VaultService>(VaultService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all entries for the user', async () => {
      const entries = [{ id: '1', userId: 'u1', title: 'Gmail' }];
      mockVaultRepo.findAllByUser.mockResolvedValue(entries);
      expect(await service.findAll('u1')).toEqual(entries);
      expect(mockVaultRepo.findAllByUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('findOne', () => {
    it('returns entry when found', async () => {
      const entry = { id: '1', userId: 'u1', title: 'Gmail' };
      mockVaultRepo.findOneByUser.mockResolvedValue(entry);
      expect(await service.findOne('1', 'u1')).toEqual(entry);
    });

    it('throws NotFoundException when not found', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue(null);
      await expect(service.findOne('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns a new entry', async () => {
      const entry = { id: '1', userId: 'u1', title: 'Gmail', value: 'secret', notes: null };
      mockVaultRepo.create.mockResolvedValue(entry);
      expect(await service.create('u1', { title: 'Gmail', value: 'secret' })).toEqual(entry);
      expect(mockVaultRepo.create).toHaveBeenCalledWith('u1', { title: 'Gmail', value: 'secret' });
    });
  });

  describe('update', () => {
    it('updates and returns the entry', async () => {
      const updated = { id: '1', userId: 'u1', title: 'Gmail Updated', value: 'secret', notes: null };
      mockVaultRepo.findOneByUser.mockResolvedValue({ id: '1' });
      mockVaultRepo.update.mockResolvedValue(updated);
      expect(await service.update('1', 'u1', { title: 'Gmail Updated' })).toEqual(updated);
    });

    it('throws NotFoundException when entry not found', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue(null);
      await expect(service.update('missing', 'u1', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the entry', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue({ id: '1' });
      mockVaultRepo.deleteOne.mockResolvedValue(undefined);
      await expect(service.remove('1', 'u1')).resolves.toBeUndefined();
      expect(mockVaultRepo.deleteOne).toHaveBeenCalledWith('1', 'u1');
    });

    it('throws NotFoundException when entry not found', async () => {
      mockVaultRepo.findOneByUser.mockResolvedValue(null);
      await expect(service.remove('missing', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern=vault.service.spec
```

Expected: FAIL — `VaultService` methods throw `'Not implemented'`.

- [ ] **Step 3: Implement VaultService**

Replace `apps/api/src/modules/vault/vault.service.ts` with:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { VaultRepository } from '../../database/repositories/vault.repository';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';
import { VaultEntity } from '../../database/entities/vault.entity';

@Injectable()
export class VaultService {
  constructor(private readonly vaultRepo: VaultRepository) {}

  findAll(userId: string): Promise<VaultEntity[]> {
    return this.vaultRepo.findAllByUser(userId);
  }

  async findOne(id: string, userId: string): Promise<VaultEntity> {
    const entry = await this.vaultRepo.findOneByUser(id, userId);
    if (!entry) throw new NotFoundException('Vault entry not found');
    return entry;
  }

  create(userId: string, dto: CreateVaultEntryDto): Promise<VaultEntity> {
    return this.vaultRepo.create(userId, dto);
  }

  async update(id: string, userId: string, dto: UpdateVaultEntryDto): Promise<VaultEntity> {
    await this.findOne(id, userId);
    return this.vaultRepo.update(id, userId, dto);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    return this.vaultRepo.deleteOne(id, userId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern=vault.service.spec
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/vault/vault.service.ts apps/api/src/modules/vault/vault.service.spec.ts
git commit -m "feat(api): implement VaultService with tests"
```

---

## Task 4: VaultController and VaultModule Wiring

**Files:**
- Modify: `apps/api/src/modules/vault/vault.controller.ts`
- Modify: `apps/api/src/modules/vault/vault.module.ts`

- [ ] **Step 1: Replace vault controller**

Replace `apps/api/src/modules/vault/vault.controller.ts` with:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VaultService } from './vault.service';
import { CreateVaultEntryDto } from './dto/create-vault-entry.dto';
import { UpdateVaultEntryDto } from './dto/update-vault-entry.dto';

@Controller('vault')
@UseGuards(JwtAuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  findAll(@CurrentUser() user: { userId: string }) {
    return this.vaultService.findAll(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.vaultService.findOne(id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVaultEntryDto, @CurrentUser() user: { userId: string }) {
    return this.vaultService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVaultEntryDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.vaultService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.vaultService.remove(id, user.userId);
  }
}
```

- [ ] **Step 2: Update VaultModule to import AuthModule**

Replace `apps/api/src/modules/vault/vault.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
```

- [ ] **Step 3: Full build + test**

```bash
cd apps/api && pnpm build && pnpm test
```

Expected: build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/vault/vault.controller.ts apps/api/src/modules/vault/vault.module.ts
git commit -m "feat(api): wire JWT-guarded vault controller and module"
```

---

## Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update encryption model section**

In `CLAUDE.md`, find the "Encryption model" section under Architecture and replace it:

```markdown
### Data model (vault)

The vault uses a **hybrid model**: the server stores individual rows per entry (`title`, `value`, `notes`). The server knows entry count but not the semantic meaning of values. Full zero-knowledge encryption is not implemented — `value` is stored as plaintext on the server.

Each vault operation hits a dedicated endpoint (`GET /vault`, `GET /vault/:id`, `POST /vault`, `PATCH /vault/:id`, `DELETE /vault/:id`). All endpoints require a valid JWT; `userId` is extracted from the token via `JwtAuthGuard`.
```

Also update the API section to remove references to `PUT /vault` blob endpoint and the `GET /vault` single-blob endpoint, replacing with the 5 per-entry endpoints.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect hybrid vault model"
```

---

## Task 6: Frontend Types and API Client

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/types/index.ts`
- Modify: `apps/desktop-app/src/renderer/src/lib/api.ts`

- [ ] **Step 1: Update VaultEntry type — remove categoryId, remove blob types**

Replace `apps/desktop-app/src/renderer/src/types/index.ts` with:

```typescript
export interface VaultEntry {
  id: string;
  title: string;
  value: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaltResponse {
  userId: string;
  salt: string;
}

export interface RegisterRequest {
  username: string;
  salt: string;
  passwordHash: string;
}

export interface RegisterResponse {
  token: string;
  userId: string;
}

export interface LoginRequest {
  userId: string;
  passwordHash: string;
}

export interface TokenResponse {
  token: string;
}

export interface CreateVaultEntryRequest {
  title: string;
  value: string;
  notes?: string;
}

export interface UpdateVaultEntryRequest {
  title?: string;
  value?: string;
  notes?: string | null;
}
```

- [ ] **Step 2: Add vault API methods, remove blob methods**

Replace `apps/desktop-app/src/renderer/src/lib/api.ts` with:

```typescript
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  TokenResponse,
  SaltResponse,
  VaultEntry,
  CreateVaultEntryRequest,
  UpdateVaultEntryRequest,
} from '@renderer/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method ?? 'GET';
  console.debug(`[api] ${method} ${BASE_URL}/api${path}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  } catch (err) {
    console.error(`[api] ${method} ${path} — network error:`, err);
    throw err;
  }

  if (!response.ok) {
    const error = await response.text();
    console.error(`[api] ${method} ${path} — ${response.status}:`, error);
    throw new Error(error || `HTTP ${response.status}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSalt: (query: { userId?: string; username?: string }) => {
    const params = new URLSearchParams();
    if (query.userId) params.set('userId', query.userId);
    if (query.username) params.set('username', query.username);
    return request<SaltResponse>(`/auth/salt?${params.toString()}`);
  },

  register: (body: RegisterRequest) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getVaultEntries: (token: string) =>
    request<VaultEntry[]>('/vault', {}, token),

  getVaultEntry: (id: string, token: string) =>
    request<VaultEntry>(`/vault/${id}`, {}, token),

  createVaultEntry: (body: CreateVaultEntryRequest, token: string) =>
    request<VaultEntry>('/vault', { method: 'POST', body: JSON.stringify(body) }, token),

  updateVaultEntry: (id: string, body: UpdateVaultEntryRequest, token: string) =>
    request<VaultEntry>(`/vault/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteVaultEntry: (id: string, token: string) =>
    request<void>(`/vault/${id}`, { method: 'DELETE' }, token),
};
```

- [ ] **Step 3: Type-check**

```bash
cd apps/desktop-app && pnpm typecheck 2>/dev/null || pnpm exec tsc --noEmit
```

Expected: no errors (or only errors in files not yet updated — useVault and VaultPage will be fixed in next tasks).

- [ ] **Step 4: Commit**

```bash
git add apps/desktop-app/src/renderer/src/types/index.ts apps/desktop-app/src/renderer/src/lib/api.ts
git commit -m "feat(desktop-app): update VaultEntry type and api client for per-entry vault endpoints"
```

---

## Task 7: Rewrite useVault Hook

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/hooks/useVault.ts`

- [ ] **Step 1: Rewrite the hook**

Replace `apps/desktop-app/src/renderer/src/hooks/useVault.ts` with:

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import type { VaultEntry, CreateVaultEntryRequest, UpdateVaultEntryRequest } from '@renderer/types';

export function useVault() {
  const { jwt } = useAuth();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVault = useCallback(async () => {
    if (!jwt) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVaultEntries(jwt);
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  }, [jwt]);

  const addEntry = useCallback(
    async (entry: CreateVaultEntryRequest) => {
      if (!jwt) throw new Error('Not authenticated');
      const newEntry = await api.createVaultEntry(entry, jwt);
      setEntries((prev) => [...prev, newEntry]);
      return newEntry;
    },
    [jwt],
  );

  const updateEntry = useCallback(
    async (id: string, patch: UpdateVaultEntryRequest) => {
      if (!jwt) throw new Error('Not authenticated');
      const prev = entries;
      setEntries((current) =>
        current.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)),
      );
      try {
        const updated = await api.updateVaultEntry(id, patch, jwt);
        setEntries((current) => current.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [jwt, entries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!jwt) throw new Error('Not authenticated');
      const prev = entries;
      setEntries((current) => current.filter((e) => e.id !== id));
      try {
        await api.deleteVaultEntry(id, jwt);
      } catch (e) {
        setEntries(prev);
        throw e;
      }
    },
    [jwt, entries],
  );

  return { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry };
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/desktop-app && pnpm exec tsc --noEmit
```

Expected: no errors in `useVault.ts` (VaultPage may still have errors — fixed next).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop-app/src/renderer/src/hooks/useVault.ts
git commit -m "feat(desktop-app): rewrite useVault hook to use per-entry API"
```

---

## Task 8: Rewrite VaultPage UI

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/pages/VaultPage.tsx`

- [ ] **Step 1: Rewrite VaultPage**

Replace `apps/desktop-app/src/renderer/src/pages/VaultPage.tsx` with:

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@renderer/context/AuthContext';
import { useVault } from '@renderer/hooks/useVault';
import type { VaultEntry } from '@renderer/types';

type Panel =
  | { mode: 'none' }
  | { mode: 'add' }
  | { mode: 'detail'; entry: VaultEntry }
  | { mode: 'edit'; entry: VaultEntry };

export default function VaultPage() {
  const { lock } = useAuth();
  const { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry } = useVault();

  const [search, setSearch] = useState('');
  const [panel, setPanel] = useState<Panel>({ mode: 'none' });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Add form state
  const [addTitle, setAddTitle] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReveal, setEditReveal] = useState(false);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function handleAdd() {
    if (!addTitle.trim() || !addValue.trim()) return;
    setMutationError(null);
    try {
      await addEntry({ title: addTitle.trim(), value: addValue, notes: addNotes.trim() || undefined });
      setAddTitle('');
      setAddValue('');
      setAddNotes('');
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  function openEdit(entry: VaultEntry) {
    setEditTitle(entry.title);
    setEditValue(entry.value);
    setEditNotes(entry.notes ?? '');
    setEditReveal(false);
    setPanel({ mode: 'edit', entry });
  }

  async function handleUpdate(entry: VaultEntry) {
    setMutationError(null);
    try {
      await updateEntry(entry.id, {
        title: editTitle.trim(),
        value: editValue,
        notes: editNotes.trim() || null,
      });
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  async function handleDelete(id: string) {
    setMutationError(null);
    try {
      await deleteEntry(id);
      setPanel({ mode: 'none' });
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">SafePass</h1>
        <button
          onClick={lock}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
        >
          Lock
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {(error || mutationError) && (
          <p className="mb-4 text-sm text-red-400">{mutationError ?? error}</p>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setPanel({ mode: 'add' })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            + Add
          </button>
        </div>

        {/* Add form */}
        {panel.mode === 'add' && (
          <div className="mb-6 space-y-3 rounded-xl bg-gray-900 p-6">
            <h2 className="font-semibold">New Entry</h2>
            <input
              type="text"
              placeholder="Title"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Secret / Password"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setPanel({ mode: 'none' })}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entry list */}
        {loading && <p className="text-gray-400">Loading vault…</p>}

        <ul className="space-y-2">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl bg-gray-900 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setPanel({ mode: 'detail', entry })}
                    className="truncate font-semibold hover:underline text-left"
                  >
                    {entry.title}
                  </button>
                  {entry.notes && (
                    <p className="mt-0.5 truncate text-sm text-gray-400">{entry.notes}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="font-mono text-gray-400">
                      {revealedIds.has(entry.id) ? entry.value : '••••••••'}
                    </span>
                    <button
                      onClick={() => toggleReveal(entry.id)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      {revealedIds.has(entry.id) ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => copyValue(entry.value)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Detail panel */}
        {panel.mode === 'detail' && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{panel.entry.title}</h2>
                <button
                  onClick={() => setPanel({ mode: 'none' })}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Value</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {revealedIds.has(panel.entry.id) ? panel.entry.value : '••••••••'}
                  </span>
                  <button
                    onClick={() => toggleReveal(panel.entry.id)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    {revealedIds.has(panel.entry.id) ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => copyValue(panel.entry.value)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
              {panel.entry.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm">{panel.entry.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">
                  Created {new Date(panel.entry.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => openEdit(panel.entry)}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(panel.entry.id)}
                  className="rounded-lg bg-red-600/20 px-4 py-2 text-sm text-red-400 hover:bg-red-600/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit panel */}
        {panel.mode === 'edit' && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Edit Entry</h2>
                <button
                  onClick={() => setPanel({ mode: 'none' })}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {mutationError && (
                <p className="text-sm text-red-400">{mutationError}</p>
              )}
              <input
                type="text"
                placeholder="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="relative">
                <input
                  type={editReveal ? 'text' : 'password'}
                  placeholder="Secret / Password"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 pr-16 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setEditReveal((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
                >
                  {editReveal ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdate(panel.entry)}
                  className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setPanel({ mode: 'detail', entry: panel.entry })}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd apps/desktop-app && pnpm exec tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop-app/src/renderer/src/pages/VaultPage.tsx
git commit -m "feat(desktop-app): rewrite VaultPage with search, reveal/copy, detail and edit panel"
```

---

## Task 9: Smoke Test End-to-End

- [ ] **Step 1: Start the stack**

```bash
# Terminal 1
docker compose up db

# Terminal 2
cd apps/api && pnpm dev

# Terminal 3
cd apps/desktop-app && pnpm dev
```

- [ ] **Step 2: Verify backend endpoints manually**

Register a user and test vault endpoints:

```bash
# Register
curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"test","salt":"abc","passwordHash":"aGFzaA=="}' | jq .

# Copy the token, then:
TOKEN=<paste token>

# Create entry
curl -s -X POST http://localhost:3000/api/vault \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Gmail","value":"mysecret","notes":"personal"}' | jq .

# List entries
curl -s http://localhost:3000/api/vault \
  -H "Authorization: Bearer $TOKEN" | jq .

# Update entry (use id from create response)
curl -s -X PATCH http://localhost:3000/api/vault/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Gmail Updated"}' | jq .

# Delete entry
curl -s -X DELETE http://localhost:3000/api/vault/<id> \
  -H "Authorization: Bearer $TOKEN" -v
```

Expected: 401 without token, correct CRUD responses with token.

- [ ] **Step 3: Test frontend in the app**

Open the desktop app, register/login, then:
- Add an entry — verify it appears in the list
- Click the title — verify detail panel opens with masked value
- Click Show — verify value reveals
- Click Copy — verify value is in clipboard
- Search by title — verify list filters
- Click Edit — verify edit panel opens pre-filled, save updates the entry
- Click Delete — verify entry is removed

- [ ] **Step 4: Run full test suite**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md vault architecture section"
```
