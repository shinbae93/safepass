# Auth Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-user authentication (register + login) for both the NestJS API and the Electron desktop app.

**Architecture:** The API implements four auth endpoints backed by the `UserEntity` and `UserRepository`. The desktop app adds an electron-store IPC bridge for persisting usernames, updates `AuthContext` to track the active username, and rewrites the Setup and Unlock pages to handle multi-user flows.

**Tech Stack:** NestJS + `@nestjs/jwt` + TypeORM (API); Electron + electron-store + React + react-router-dom (desktop app).

---

## File Map

### API — modified
- `apps/api/src/database/entities/user.entity.ts` — add `UNIQUE` constraint to `username`
- `apps/api/src/database/repositories/user.repository.ts` — add `findByUsername`, `existsByUsername`, `countAll`
- `apps/api/src/modules/auth/dto/setup.dto.ts` — replace with `{ username, salt, passwordHash }`
- `apps/api/src/modules/auth/dto/unlock.dto.ts` — replace with `{ username, passwordHash }`
- `apps/api/src/modules/auth/auth.service.ts` — implement all four methods
- `apps/api/src/modules/auth/auth.module.ts` — import `JwtModule`

### API — created
- `apps/api/src/modules/auth/auth.service.spec.ts` — unit tests for `AuthService`

### Desktop app — modified
- `apps/desktop-app/src/main/index.ts` — add electron-store + IPC handlers
- `apps/desktop-app/src/preload/index.ts` — expose `storeAPI` bridge
- `apps/desktop-app/src/renderer/src/context/AuthContext.tsx` — add `username` state + `setUsername`
- `apps/desktop-app/src/renderer/src/lib/api.ts` — update `setup` / `unlock` / `getSalt` signatures
- `apps/desktop-app/src/renderer/src/types/index.ts` — update request/response types
- `apps/desktop-app/src/renderer/src/pages/SetupPage.tsx` — add username field
- `apps/desktop-app/src/renderer/src/pages/UnlockPage.tsx` — add username picker + "Use a different account"
- `apps/desktop-app/src/renderer/src/App.tsx` — routing guard unchanged in logic, no changes needed

---

## Task 1: Fix `UserEntity` — add UNIQUE constraint to username

**Files:**
- Modify: `apps/api/src/database/entities/user.entity.ts`

- [ ] **Step 1: Update the `username` column decorator**

Replace the `username` column:

```typescript
@Column({ type: 'varchar', length: 255, unique: true })
username: string;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/database/entities/user.entity.ts
git commit -m "feat(api): add unique constraint to username"
```

---

## Task 2: Implement `UserRepository` methods

**Files:**
- Modify: `apps/api/src/database/repositories/user.repository.ts`

- [ ] **Step 1: Add the three query methods**

Replace the file contents:

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

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { username } });
  }

  existsByUsername(username: string): Promise<boolean> {
    return this.repo.exists({ where: { username } });
  }

  countAll(): Promise<number> {
    return this.repo.count();
  }

  save(entity: Partial<UserEntity>): Promise<UserEntity> {
    return this.repo.save(entity);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/database/repositories/user.repository.ts
git commit -m "feat(api): implement UserRepository query methods"
```

---

## Task 3: Update DTOs

**Files:**
- Modify: `apps/api/src/modules/auth/dto/setup.dto.ts`
- Modify: `apps/api/src/modules/auth/dto/unlock.dto.ts`

- [ ] **Step 1: Rewrite `SetupDto`**

```typescript
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  salt: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  passwordHash: string;
}
```

- [ ] **Step 2: Rewrite `UnlockDto`**

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
git add apps/api/src/modules/auth/dto/setup.dto.ts apps/api/src/modules/auth/dto/unlock.dto.ts
git commit -m "feat(api): update auth DTOs for multi-user"
```

---

## Task 4: Wire `JwtModule` into `AuthModule`

**Files:**
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Import `JwtModule` with config**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    DatabaseModule,
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
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 2: Add `jwtSecret` to app config**

In `apps/api/src/config/app.config.ts`, add the `jwtSecret` field:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'dev_jwt_secret_change_me',
}));
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.module.ts apps/api/src/config/app.config.ts
git commit -m "feat(api): wire JwtModule into AuthModule"
```

---

## Task 5: Write failing tests for `AuthService`

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../../database/repositories/user.repository';

const mockUserRepo = {
  countAll: jest.fn(),
  existsByUsername: jest.fn(),
  findByUsername: jest.fn(),
  save: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('returns initialized: false when no users exist', async () => {
      mockUserRepo.countAll.mockResolvedValue(0);
      expect(await service.getStatus()).toEqual({ initialized: false });
    });

    it('returns initialized: true when users exist', async () => {
      mockUserRepo.countAll.mockResolvedValue(1);
      expect(await service.getStatus()).toEqual({ initialized: true });
    });
  });

  describe('getSalt', () => {
    it('returns the salt for an existing user', async () => {
      mockUserRepo.findByUsername.mockResolvedValue({ username: 'alice', salt: 'abc123' });
      expect(await service.getSalt('alice')).toEqual({ salt: 'abc123' });
    });

    it('throws UnauthorizedException for unknown username', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(null);
      await expect(service.getSalt('ghost')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setup', () => {
    it('creates a user and returns a token', async () => {
      mockUserRepo.existsByUsername.mockResolvedValue(false);
      mockUserRepo.save.mockResolvedValue({ id: 'uuid-1', username: 'alice' });
      mockJwtService.sign.mockReturnValue('jwt-token');
      const result = await service.setup({ username: 'alice', salt: 'salt', passwordHash: 'hash' });
      expect(result).toEqual({ token: 'jwt-token' });
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', salt: 'salt', passwordHash: 'hash' }),
      );
    });

    it('throws ConflictException when username is taken', async () => {
      mockUserRepo.existsByUsername.mockResolvedValue(true);
      await expect(
        service.setup({ username: 'alice', salt: 'salt', passwordHash: 'hash' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlock', () => {
    it('returns a token on correct passwordHash', async () => {
      const hash = Buffer.from('abc').toString('base64');
      mockUserRepo.findByUsername.mockResolvedValue({ id: 'uuid-1', username: 'alice', passwordHash: hash });
      mockJwtService.sign.mockReturnValue('jwt-token');
      const result = await service.unlock({ username: 'alice', passwordHash: hash });
      expect(result).toEqual({ token: 'jwt-token' });
    });

    it('throws UnauthorizedException for unknown username', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(null);
      await expect(service.unlock({ username: 'ghost', passwordHash: 'hash' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong passwordHash', async () => {
      mockUserRepo.findByUsername.mockResolvedValue({
        id: 'uuid-1',
        username: 'alice',
        passwordHash: Buffer.from('correct').toString('base64'),
      });
      await expect(service.unlock({ username: 'alice', passwordHash: Buffer.from('wrong').toString('base64') })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd apps/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: FAIL — `AuthService` methods throw `Error('Not implemented')`.

- [ ] **Step 3: Commit the failing tests**

```bash
git add apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "test(api): add failing AuthService unit tests"
```

---

## Task 6: Implement `AuthService`

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Write the implementation**

```typescript
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UserRepository } from '../../database/repositories/user.repository';
import { SetupDto } from './dto/setup.dto';
import { UnlockDto } from './dto/unlock.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async getStatus(): Promise<{ initialized: boolean }> {
    const count = await this.userRepo.countAll();
    return { initialized: count > 0 };
  }

  async getSalt(username: string): Promise<{ salt: string }> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) throw new UnauthorizedException('Unknown username');
    return { salt: user.salt };
  }

  async setup(dto: SetupDto): Promise<{ token: string }> {
    const exists = await this.userRepo.existsByUsername(dto.username);
    if (exists) throw new ConflictException('Username already taken');
    const user = await this.userRepo.save({
      username: dto.username,
      salt: dto.salt,
      passwordHash: dto.passwordHash,
    });
    const token = this.jwtService.sign({ sub: user.id });
    return { token };
  }

  async unlock(dto: UnlockDto): Promise<{ token: string }> {
    const user = await this.userRepo.findByUsername(dto.username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const storedHash = Buffer.from(user.passwordHash, 'base64');
    const incomingHash = Buffer.from(dto.passwordHash, 'base64');

    if (
      storedHash.length !== incomingHash.length ||
      !crypto.timingSafeEqual(storedHash, incomingHash)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id });
    return { token };
  }
}
```

- [ ] **Step 2: Update `AuthController` to pass `username` query param for `getSalt`**

```typescript
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  getSalt(@Query('username') username: string) {
    return this.authService.getSalt(username);
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

- [ ] **Step 3: Run tests — expect PASS**

```bash
cd apps/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: all 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.controller.ts
git commit -m "feat(api): implement AuthService and update AuthController"
```

---

## Task 7: Add `UserRepository` to `DatabaseModule` providers

**Files:**
- Modify: `apps/api/src/database/database.module.ts`

- [ ] **Step 1: Read the current file and add `UserRepository` to exports**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from './entities/user.entity';
import { VaultEntity } from './entities/vault.entity';
import { UserRepository } from './repositories/user.repository';
import { VaultRepository } from './repositories/vault.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.name'),
        entities: [UserEntity, VaultEntity],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([UserEntity, VaultEntity]),
  ],
  providers: [UserRepository, VaultRepository],
  exports: [UserRepository, VaultRepository],
})
export class DatabaseModule {}
```

> Note: Read `apps/api/src/database/database.module.ts` first to get the exact current content and preserve it — only add `UserRepository` and `VaultRepository` to providers/exports if they aren't already there.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/database/database.module.ts
git commit -m "feat(api): export UserRepository from DatabaseModule"
```

---

## Task 8: Install `electron-store` in desktop app

**Files:**
- Modify: `apps/desktop-app/package.json`

- [ ] **Step 1: Install the package**

```bash
cd apps/desktop-app && pnpm add electron-store
```

- [ ] **Step 2: Verify it appears in `dependencies`**

```bash
grep '"electron-store"' apps/desktop-app/package.json
```

Expected: `"electron-store": "^<version>"`

- [ ] **Step 3: Commit**

```bash
git add apps/desktop-app/package.json pnpm-lock.yaml
git commit -m "feat(desktop-app): add electron-store dependency"
```

---

## Task 9: Add IPC handlers in main process

**Files:**
- Modify: `apps/desktop-app/src/main/index.ts`

- [ ] **Step 1: Rewrite `main/index.ts` with store + IPC handlers**

```typescript
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import Store from 'electron-store';

interface StoreSchema {
  users: string[];
}

const store = new Store<StoreSchema>({
  defaults: { users: [] },
});

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('store:get-users', () => {
  return store.get('users');
});

ipcMain.handle('store:add-user', (_event, username: string) => {
  const users = store.get('users');
  if (!users.includes(username)) {
    store.set('users', [...users, username]);
  }
});

app.whenReady().then(() => {
  delete process.env['NODE_OPTIONS'];
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/main/index.ts
git commit -m "feat(desktop-app): add electron-store IPC handlers"
```

---

## Task 10: Expose `storeAPI` via preload bridge

**Files:**
- Modify: `apps/desktop-app/src/preload/index.ts`

- [ ] **Step 1: Add `storeAPI` to the preload bridge**

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

contextBridge.exposeInMainWorld('electron', electronAPI);

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('storeAPI', {
  getUsers: (): Promise<string[]> => ipcRenderer.invoke('store:get-users'),
  addUser: (username: string): Promise<void> => ipcRenderer.invoke('store:add-user', username),
});
```

- [ ] **Step 2: Add the TypeScript declaration for `storeAPI` to the env.d.ts**

In `apps/desktop-app/src/renderer/src/env.d.ts`, add:

```typescript
interface Window {
  storeAPI: {
    getUsers(): Promise<string[]>;
    addUser(username: string): Promise<void>;
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop-app/src/preload/index.ts apps/desktop-app/src/renderer/src/env.d.ts
git commit -m "feat(desktop-app): expose storeAPI in preload bridge"
```

---

## Task 11: Update types and `api.ts` for multi-user

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/types/index.ts`
- Modify: `apps/desktop-app/src/renderer/src/lib/api.ts`

- [ ] **Step 1: Update types**

Replace the auth-related interfaces in `types/index.ts`:

```typescript
export interface VaultEntry {
  id: string;
  title: string;
  value: string;
  notes: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthStatus {
  initialized: boolean;
}

export interface SaltResponse {
  salt: string;
}

export interface SetupRequest {
  username: string;
  salt: string;
  passwordHash: string;
}

export interface UnlockRequest {
  username: string;
  passwordHash: string;
}

export interface TokenResponse {
  token: string;
}

export interface VaultResponse {
  encryptedData: string;
  iv: string;
}

export interface VaultUpdateRequest {
  encryptedData: string;
  iv: string;
}
```

- [ ] **Step 2: Update `api.ts`**

```typescript
import type { SetupRequest, UnlockRequest, TokenResponse, AuthStatus, SaltResponse, VaultResponse } from '@renderer/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getStatus: () => request<AuthStatus>('/auth/status'),

  getSalt: (username: string) =>
    request<SaltResponse>(`/auth/salt?username=${encodeURIComponent(username)}`),

  setup: (body: SetupRequest) =>
    request<TokenResponse>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  unlock: (body: UnlockRequest) =>
    request<TokenResponse>('/auth/unlock', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getVault: (token: string) => request<VaultResponse>('/vault', {}, token),

  putVault: (body: VaultUpdateRequest, token: string) =>
    request<void>('/vault', { method: 'PUT', body: JSON.stringify(body) }, token),
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop-app/src/renderer/src/types/index.ts apps/desktop-app/src/renderer/src/lib/api.ts
git commit -m "feat(desktop-app): update types and api client for multi-user auth"
```

---

## Task 12: Update `AuthContext` to track username

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/context/AuthContext.tsx`

- [ ] **Step 1: Rewrite `AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { api } from '@renderer/lib/api';

interface AuthContextValue {
  initialized: boolean;
  statusLoading: boolean;
  jwt: string | null;
  username: string | null;
  cryptoKeyRef: React.MutableRefObject<CryptoKey | null>;
  setJwt: (token: string | null) => void;
  setUsername: (username: string | null) => void;
  setInitialized: (value: boolean) => void;
  lock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [jwt, setJwt] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getStatus()
      .then(({ initialized }) => {
        if (!controller.signal.aborted) {
          setInitialized(initialized);
          setStatusLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatusLoading(false);
      });
    return () => controller.abort();
  }, []);

  function lock() {
    cryptoKeyRef.current = null;
    setJwt(null);
    setUsername(null);
  }

  return (
    <AuthContext.Provider
      value={{
        initialized,
        statusLoading,
        jwt,
        username,
        cryptoKeyRef,
        setJwt,
        setUsername,
        setInitialized,
        lock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/renderer/src/context/AuthContext.tsx
git commit -m "feat(desktop-app): add username state to AuthContext"
```

---

## Task 13: Rewrite `SetupPage` with username field

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/pages/SetupPage.tsx`

- [ ] **Step 1: Rewrite the page**

```typescript
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import { deriveKey, hashKey, generateSalt, saltToBase64 } from '@renderer/lib/crypto';

export default function SetupPage() {
  const { cryptoKeyRef, setJwt, setUsername, setInitialized } = useAuth();
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const salt = generateSalt();
      const saltB64 = saltToBase64(salt);
      const key = await deriveKey(password, salt);
      const passwordHash = await hashKey(key);
      const { token } = await api.setup({ username: usernameInput.trim(), salt: saltB64, passwordHash });
      await window.storeAPI.addUser(usernameInput.trim());
      cryptoKeyRef.current = key;
      setJwt(token);
      setUsername(usernameInput.trim());
      setInitialized(true);
      navigate('/vault');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-gray-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/renderer/src/pages/SetupPage.tsx
git commit -m "feat(desktop-app): add username field to SetupPage"
```

---

## Task 14: Rewrite `UnlockPage` with username picker

**Files:**
- Modify: `apps/desktop-app/src/renderer/src/pages/UnlockPage.tsx`

- [ ] **Step 1: Rewrite the page**

```typescript
import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@renderer/context/AuthContext';
import { api } from '@renderer/lib/api';
import { deriveKey, hashKey, base64ToSalt } from '@renderer/lib/crypto';

export default function UnlockPage() {
  const { cryptoKeyRef, setJwt, setUsername } = useAuth();
  const navigate = useNavigate();
  const [knownUsers, setKnownUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [manualUsername, setManualUsername] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.storeAPI.getUsers().then((users) => {
      setKnownUsers(users);
      if (users.length > 0) setSelectedUser(users[0]);
    });
  }, []);

  const activeUsername = showManual ? manualUsername.trim() : selectedUser;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!activeUsername) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    try {
      const { salt: saltB64 } = await api.getSalt(activeUsername);
      const salt = base64ToSalt(saltB64);
      const key = await deriveKey(password, salt);
      const passwordHash = await hashKey(key);
      const { token } = await api.unlock({ username: activeUsername, passwordHash });
      await window.storeAPI.addUser(activeUsername);
      cryptoKeyRef.current = key;
      setJwt(token);
      setUsername(activeUsername);
      navigate('/vault');
    } catch {
      setError('Invalid username or master password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-gray-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Unlock SafePass</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!showManual && knownUsers.length > 0 && (
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {knownUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}

        {showManual && (
          <input
            type="text"
            placeholder="Username"
            value={manualUsername}
            onChange={(e) => setManualUsername(e.target.value)}
            className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        )}

        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-sm text-blue-400 hover:underline"
        >
          {showManual ? '← Back to saved accounts' : 'Use a different account'}
        </button>

        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/renderer/src/pages/UnlockPage.tsx
git commit -m "feat(desktop-app): rewrite UnlockPage with username picker"
```

---

## Task 15: Run full test suite and verify API starts

- [ ] **Step 1: Run all API tests**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Start the API and hit the status endpoint**

```bash
# In one terminal (with DB running):
pnpm dev:api

# In another:
curl http://localhost:3000/api/auth/status
```

Expected: `{"initialized":false}`

- [ ] **Step 3: Final commit if anything was touched**

```bash
git add -p
git commit -m "chore: auth feature complete"
```
