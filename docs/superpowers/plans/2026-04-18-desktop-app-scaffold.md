# Desktop App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `apps/desktop-app/` as a fully wired Electron app using `electron-vite`, React 18, Tailwind CSS, and shadcn/ui, calling the existing NestJS API over HTTP.

**Architecture:** Three electron-vite processes (main, preload, renderer). The renderer is a React SPA with route guards, AuthContext holding CryptoKey in memory, and useVault handling all encrypt/decrypt. All HTTP calls go from the renderer via `fetch()` to `VITE_API_URL`.

**Tech Stack:** Electron, electron-vite, React 18, React Router v6, Tailwind CSS v4, shadcn/ui (Radix), TypeScript, Web Crypto API.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/desktop-app/package.json` | Create | Package manifest, scripts, deps |
| `apps/desktop-app/electron.vite.config.ts` | Create | Three Vite configs (main/preload/renderer) |
| `apps/desktop-app/tsconfig.json` | Create | Base TS config referencing node + web configs |
| `apps/desktop-app/tsconfig.node.json` | Create | TS config for main + preload (Node target) |
| `apps/desktop-app/tsconfig.web.json` | Create | TS config for renderer (browser target) |
| `apps/desktop-app/.env.example` | Create | `VITE_API_URL=` template |
| `apps/desktop-app/.gitignore` | Create | Ignore `.env`, `dist`, `node_modules`, `out` |
| `apps/desktop-app/src/main/index.ts` | Create | BrowserWindow setup, app lifecycle |
| `apps/desktop-app/src/preload/index.ts` | Create | contextBridge exposing `electronAPI.getVersion` |
| `apps/desktop-app/src/renderer/index.html` | Create | HTML entry point |
| `apps/desktop-app/src/renderer/src/main.tsx` | Create | React root, mounts `<App />` |
| `apps/desktop-app/src/renderer/src/App.tsx` | Create | React Router with route guards |
| `apps/desktop-app/src/renderer/src/types/index.ts` | Create | Shared TS interfaces (VaultEntry, AuthStatus) |
| `apps/desktop-app/src/renderer/src/lib/api.ts` | Create | `fetch()` wrapper reading `VITE_API_URL` |
| `apps/desktop-app/src/renderer/src/lib/crypto.ts` | Create | PBKDF2 key derivation + AES-256-GCM encrypt/decrypt |
| `apps/desktop-app/src/renderer/src/context/AuthContext.tsx` | Create | CryptoKey ref + JWT in memory + initialized state |
| `apps/desktop-app/src/renderer/src/hooks/useVault.ts` | Create | Vault CRUD + optimistic mutations + rollback |
| `apps/desktop-app/src/renderer/src/pages/SetupPage.tsx` | Create | Master password setup form |
| `apps/desktop-app/src/renderer/src/pages/UnlockPage.tsx` | Create | Unlock form |
| `apps/desktop-app/src/renderer/src/pages/VaultPage.tsx` | Create | Vault list + entry management |
| `package.json` (root) | Modify | Add `dev:desktop` and `build:desktop` scripts |

---

## Task 1: Package manifest and build config

**Files:**
- Create: `apps/desktop-app/package.json`
- Create: `apps/desktop-app/electron.vite.config.ts`
- Create: `apps/desktop-app/tsconfig.json`
- Create: `apps/desktop-app/tsconfig.node.json`
- Create: `apps/desktop-app/tsconfig.web.json`
- Create: `apps/desktop-app/.env.example`
- Create: `apps/desktop-app/.gitignore`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p apps/desktop-app/src/main apps/desktop-app/src/preload apps/desktop-app/src/renderer/src apps/desktop-app/resources
```

- [ ] **Step 2: Create `apps/desktop-app/package.json`**

```json
{
  "name": "@safepass/desktop-app",
  "version": "0.1.0",
  "private": true,
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {
    "electron": "^33.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@electron-toolkit/tsconfig": "^1.0.1",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "electron-vite": "^2.3.0",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 3: Create `apps/desktop-app/electron.vite.config.ts`**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
```

- [ ] **Step 4: Create `apps/desktop-app/tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

- [ ] **Step 5: Create `apps/desktop-app/tsconfig.node.json`**

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": ["electron.vite.config.*", "src/main/**/*", "src/preload/**/*"],
  "compilerOptions": {
    "composite": true,
    "types": ["electron-vite/node"]
  }
}
```

- [ ] **Step 6: Create `apps/desktop-app/tsconfig.web.json`**

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": ["src/renderer/**/*"],
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@renderer/*": ["src/renderer/src/*"]
    }
  }
}
```

- [ ] **Step 7: Create `apps/desktop-app/.env.example`**

```
VITE_API_URL=
```

- [ ] **Step 8: Create `apps/desktop-app/.gitignore`**

```
node_modules
dist
out
.env
```

- [ ] **Step 9: Install dependencies**

```bash
cd apps/desktop-app && pnpm install
```

Expected: packages install without errors.

- [ ] **Step 10: Commit**

```bash
git add apps/desktop-app/package.json apps/desktop-app/electron.vite.config.ts apps/desktop-app/tsconfig.json apps/desktop-app/tsconfig.node.json apps/desktop-app/tsconfig.web.json apps/desktop-app/.env.example apps/desktop-app/.gitignore
git commit -m "chore(desktop-app): add package manifest and build config"
```

---

## Task 2: Electron main process and preload

**Files:**
- Create: `apps/desktop-app/src/main/index.ts`
- Create: `apps/desktop-app/src/preload/index.ts`
- Create: `apps/desktop-app/src/renderer/index.html`

- [ ] **Step 1: Create `apps/desktop-app/src/main/index.ts`**

```typescript
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

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
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

- [ ] **Step 2: Create `apps/desktop-app/src/preload/index.ts`**

```typescript
import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

contextBridge.exposeInMainWorld('electron', electronAPI)

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => process.versions.electron
})
```

- [ ] **Step 3: Add `@electron-toolkit/preload` and `@electron-toolkit/utils` deps**

```bash
cd apps/desktop-app && pnpm add @electron-toolkit/preload @electron-toolkit/utils
```

- [ ] **Step 4: Create `apps/desktop-app/src/renderer/index.html`**

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src http://localhost:3000"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SafePass</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Verify the app boots**

```bash
cd apps/desktop-app && pnpm dev
```

Expected: Electron window opens (may show blank page — renderer not wired yet). No crash in main process. Close the window.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop-app/src/main/index.ts apps/desktop-app/src/preload/index.ts apps/desktop-app/src/renderer/index.html
git commit -m "feat(desktop-app): add electron main process and preload"
```

---

## Task 3: TypeScript types and API client

**Files:**
- Create: `apps/desktop-app/src/renderer/src/types/index.ts`
- Create: `apps/desktop-app/src/renderer/src/lib/api.ts`

- [ ] **Step 1: Create `apps/desktop-app/src/renderer/src/types/index.ts`**

```typescript
export interface VaultEntry {
  id: string
  title: string
  value: string
  notes: string | null
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthStatus {
  initialized: boolean
}

export interface SaltResponse {
  salt: string
}

export interface SetupRequest {
  salt: string
  passwordHash: string
  encryptedVault: string
  iv: string
}

export interface UnlockRequest {
  passwordHash: string
}

export interface UnlockResponse {
  token: string
}

export interface VaultResponse {
  encryptedData: string
  iv: string
}

export interface VaultUpdateRequest {
  encryptedData: string
  iv: string
}
```

- [ ] **Step 2: Create `apps/desktop-app/src/renderer/src/lib/api.ts`**

```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  getStatus: () => request<{ initialized: boolean }>('/auth/status'),

  getSalt: () => request<{ salt: string }>('/auth/salt'),

  setup: (body: {
    salt: string
    passwordHash: string
    encryptedData: string
    iv: string
  }) =>
    request<{ token: string }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  unlock: (body: { passwordHash: string }) =>
    request<{ token: string }>('/auth/unlock', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getVault: (token: string) =>
    request<{ encryptedData: string; iv: string }>('/vault', {}, token),

  putVault: (body: { encryptedData: string; iv: string }, token: string) =>
    request<void>('/vault', { method: 'PUT', body: JSON.stringify(body) }, token)
}
```

- [ ] **Step 3: Create `.env` for local dev**

```bash
echo "VITE_API_URL=http://localhost:3000" > apps/desktop-app/.env
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop-app/src/renderer/src/types/index.ts apps/desktop-app/src/renderer/src/lib/api.ts
git commit -m "feat(desktop-app): add TypeScript types and API client"
```

---

## Task 4: Crypto module

**Files:**
- Create: `apps/desktop-app/src/renderer/src/lib/crypto.ts`

- [ ] **Step 1: Create `apps/desktop-app/src/renderer/src/lib/crypto.ts`**

```typescript
const PBKDF2_ITERATIONS = 600_000
const KEY_LENGTH = 256

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function hashKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', exported)
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ encryptedData: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )
  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

export async function decrypt(
  key: CryptoKey,
  encryptedData: string,
  iv: string
): Promise<string> {
  const ciphertextBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertextBytes
  )
  return new TextDecoder().decode(plaintext)
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

export function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt))
}

export function base64ToSalt(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/renderer/src/lib/crypto.ts
git commit -m "feat(desktop-app): add crypto module (PBKDF2 + AES-256-GCM)"
```

---

## Task 5: AuthContext

**Files:**
- Create: `apps/desktop-app/src/renderer/src/context/AuthContext.tsx`

- [ ] **Step 1: Create `apps/desktop-app/src/renderer/src/context/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { api } from '@renderer/lib/api'

interface AuthContextValue {
  initialized: boolean
  jwt: string | null
  cryptoKeyRef: React.MutableRefObject<CryptoKey | null>
  setJwt: (token: string | null) => void
  setInitialized: (value: boolean) => void
  lock: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [jwt, setJwt] = useState<string | null>(null)
  const cryptoKeyRef = useRef<CryptoKey | null>(null)

  useEffect(() => {
    api.getStatus().then(({ initialized }) => setInitialized(initialized))
  }, [])

  function lock() {
    cryptoKeyRef.current = null
    setJwt(null)
  }

  return (
    <AuthContext.Provider
      value={{ initialized, jwt, cryptoKeyRef, setJwt, setInitialized, lock }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/renderer/src/context/AuthContext.tsx
git commit -m "feat(desktop-app): add AuthContext with in-memory CryptoKey and JWT"
```

---

## Task 6: useVault hook

**Files:**
- Create: `apps/desktop-app/src/renderer/src/hooks/useVault.ts`

- [ ] **Step 1: Create `apps/desktop-app/src/renderer/src/hooks/useVault.ts`**

```typescript
import { useState, useCallback } from 'react'
import { useAuth } from '@renderer/context/AuthContext'
import { api } from '@renderer/lib/api'
import { encrypt, decrypt } from '@renderer/lib/crypto'
import type { VaultEntry } from '@renderer/types'

export function useVault() {
  const { jwt, cryptoKeyRef } = useAuth()
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVault = useCallback(async () => {
    if (!jwt || !cryptoKeyRef.current) return
    setLoading(true)
    setError(null)
    try {
      const { encryptedData, iv } = await api.getVault(jwt)
      const plaintext = await decrypt(cryptoKeyRef.current, encryptedData, iv)
      setEntries(JSON.parse(plaintext) as VaultEntry[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vault')
    } finally {
      setLoading(false)
    }
  }, [jwt, cryptoKeyRef])

  const saveEntries = useCallback(
    async (next: VaultEntry[]) => {
      if (!jwt || !cryptoKeyRef.current) return
      const { encryptedData, iv } = await encrypt(
        cryptoKeyRef.current,
        JSON.stringify(next)
      )
      await api.putVault({ encryptedData, iv }, jwt)
    },
    [jwt, cryptoKeyRef]
  )

  const addEntry = useCallback(
    async (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const prev = entries
      const newEntry: VaultEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      const next = [...prev, newEntry]
      setEntries(next)
      try {
        await saveEntries(next)
      } catch (e) {
        setEntries(prev)
        throw e
      }
    },
    [entries, saveEntries]
  )

  const updateEntry = useCallback(
    async (id: string, patch: Partial<Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const prev = entries
      const next = prev.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
      )
      setEntries(next)
      try {
        await saveEntries(next)
      } catch (e) {
        setEntries(prev)
        throw e
      }
    },
    [entries, saveEntries]
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      const prev = entries
      const next = prev.filter((e) => e.id !== id)
      setEntries(next)
      try {
        await saveEntries(next)
      } catch (e) {
        setEntries(prev)
        throw e
      }
    },
    [entries, saveEntries]
  )

  return { entries, loading, error, loadVault, addEntry, updateEntry, deleteEntry }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop-app/src/renderer/src/hooks/useVault.ts
git commit -m "feat(desktop-app): add useVault hook with optimistic mutations and rollback"
```

---

## Task 7: Pages (SetupPage, UnlockPage, VaultPage)

**Files:**
- Create: `apps/desktop-app/src/renderer/src/pages/SetupPage.tsx`
- Create: `apps/desktop-app/src/renderer/src/pages/UnlockPage.tsx`
- Create: `apps/desktop-app/src/renderer/src/pages/VaultPage.tsx`

- [ ] **Step 1: Create `apps/desktop-app/src/renderer/src/pages/SetupPage.tsx`**

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@renderer/context/AuthContext'
import { api } from '@renderer/lib/api'
import { deriveKey, hashKey, encrypt, generateSalt, saltToBase64 } from '@renderer/lib/crypto'

export default function SetupPage() {
  const { cryptoKeyRef, setJwt, setInitialized } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const salt = generateSalt()
      const saltB64 = saltToBase64(salt)
      const key = await deriveKey(password, salt)
      const passwordHash = await hashKey(key)
      const { encryptedData, iv } = await encrypt(key, JSON.stringify([]))
      const { token } = await api.setup({ salt: saltB64, passwordHash, encryptedData, iv })
      cryptoKeyRef.current = key
      setJwt(token)
      setInitialized(true)
      navigate('/vault')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-gray-900 p-8 shadow-lg"
      >
        <h1 className="text-2xl font-bold text-white">Create Master Password</h1>
        {error && <p className="text-sm text-red-400">{error}</p>}
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
          {loading ? 'Setting up…' : 'Create Vault'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/desktop-app/src/renderer/src/pages/UnlockPage.tsx`**

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@renderer/context/AuthContext'
import { api } from '@renderer/lib/api'
import { deriveKey, hashKey, base64ToSalt } from '@renderer/lib/crypto'

export default function UnlockPage() {
  const { cryptoKeyRef, setJwt } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { salt: saltB64 } = await api.getSalt()
      const salt = base64ToSalt(saltB64)
      const key = await deriveKey(password, salt)
      const passwordHash = await hashKey(key)
      const { token } = await api.unlock({ passwordHash })
      cryptoKeyRef.current = key
      setJwt(token)
      navigate('/vault')
    } catch (e) {
      setError('Invalid master password')
    } finally {
      setLoading(false)
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
        <input
          type="password"
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autoFocus
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
  )
}
```

- [ ] **Step 3: Create `apps/desktop-app/src/renderer/src/pages/VaultPage.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/context/AuthContext'
import { useVault } from '@renderer/hooks/useVault'
import type { VaultEntry } from '@renderer/types'

export default function VaultPage() {
  const { lock } = useAuth()
  const { entries, loading, error, loadVault, addEntry, deleteEntry } = useVault()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadVault()
  }, [loadVault])

  async function handleAdd() {
    if (!title || !value) return
    await addEntry({ title, value, notes: notes || null, categoryId: null })
    setTitle('')
    setValue('')
    setNotes('')
    setShowAdd(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">SafePass</h1>
        <button
          onClick={lock}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
        >
          Lock
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            {showAdd ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-6 space-y-3 rounded-xl bg-gray-900 p-6">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Secret / Password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-4 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              className="w-full rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-700"
            >
              Save Entry
            </button>
          </div>
        )}

        {loading && <p className="text-gray-400">Loading vault…</p>}

        <ul className="space-y-3">
          {entries.map((entry: VaultEntry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-xl bg-gray-900 px-6 py-4"
            >
              <div>
                <p className="font-semibold">{entry.title}</p>
                {entry.notes && <p className="text-sm text-gray-400">{entry.notes}</p>}
              </div>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop-app/src/renderer/src/pages/
git commit -m "feat(desktop-app): add SetupPage, UnlockPage, and VaultPage"
```

---

## Task 8: React entry, router, and Tailwind

**Files:**
- Create: `apps/desktop-app/src/renderer/src/main.tsx`
- Create: `apps/desktop-app/src/renderer/src/App.tsx`
- Create: `apps/desktop-app/tailwind.config.js`
- Create: `apps/desktop-app/postcss.config.js`

- [ ] **Step 1: Install Tailwind and PostCSS**

```bash
cd apps/desktop-app && pnpm add -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
```

- [ ] **Step 2: Update `apps/desktop-app/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
}
```

- [ ] **Step 3: Create Tailwind CSS entry — `apps/desktop-app/src/renderer/src/assets/index.css`**

```bash
mkdir -p apps/desktop-app/src/renderer/src/assets
```

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Save to `apps/desktop-app/src/renderer/src/assets/index.css`.

- [ ] **Step 4: Create `apps/desktop-app/src/renderer/src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Create `apps/desktop-app/src/renderer/src/App.tsx`**

```typescript
import { useEffect } from 'react'
import { MemoryRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@renderer/context/AuthContext'
import SetupPage from '@renderer/pages/SetupPage'
import UnlockPage from '@renderer/pages/UnlockPage'
import VaultPage from '@renderer/pages/VaultPage'

function AppRoutes() {
  const { initialized, jwt } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initialized) {
      navigate('/setup')
    } else if (!jwt) {
      navigate('/unlock')
    } else {
      navigate('/vault')
    }
  }, [initialized, jwt, navigate])

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/unlock" element={<UnlockPage />} />
      <Route path="/vault" element={<VaultPage />} />
      <Route path="*" element={<Navigate to="/unlock" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/unlock']}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  )
}
```

Note: `MemoryRouter` is used instead of `BrowserRouter` because Electron loads files from disk in production — there is no web server to handle URL-based routing.

- [ ] **Step 6: Verify renderer renders**

```bash
cd apps/desktop-app && pnpm dev
```

Expected: Electron window opens, shows SetupPage (dark background, "Create Master Password" form) or UnlockPage if API already initialized.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop-app/src/renderer/src/main.tsx apps/desktop-app/src/renderer/src/App.tsx apps/desktop-app/src/renderer/src/assets/index.css apps/desktop-app/tailwind.config.js apps/desktop-app/postcss.config.js
git commit -m "feat(desktop-app): wire React entry, router, and Tailwind CSS"
```

---

## Task 9: pnpm workspace integration

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Verify `apps/desktop-app` is picked up by workspace**

```bash
pnpm -r list --depth 0
```

Expected: `@safepass/desktop-app` appears in the list (it's auto-discovered via `apps/*` glob).

- [ ] **Step 2: Add root scripts**

Edit root `package.json` scripts section:

```json
{
  "scripts": {
    "dev:api": "pnpm --filter @safepass/api start:dev",
    "dev:desktop": "pnpm --filter @safepass/desktop-app dev",
    "build:api": "pnpm --filter @safepass/api build",
    "build:desktop": "pnpm --filter @safepass/desktop-app build",
    "lint": "pnpm -r lint",
    "format": "pnpm -r format",
    "test": "pnpm -r test"
  }
}
```

- [ ] **Step 3: Verify root scripts work**

```bash
pnpm dev:desktop
```

Expected: Electron app launches from the repo root. Close it.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add dev:desktop and build:desktop to root workspace scripts"
```

---

## Task 10: Final smoke test

- [ ] **Step 1: Start the API**

```bash
docker compose up db -d && pnpm dev:api
```

Expected: NestJS API running at `http://localhost:3000`.

- [ ] **Step 2: Start the desktop app**

In a second terminal:

```bash
pnpm dev:desktop
```

Expected: Electron window opens.

- [ ] **Step 3: Verify setup flow**

If fresh database: SetupPage is shown. Enter a master password and confirm it. Click "Create Vault". Expected: navigates to VaultPage showing empty vault.

- [ ] **Step 4: Verify lock/unlock flow**

Click "Lock". Expected: navigates to UnlockPage. Enter master password. Click "Unlock". Expected: navigates to VaultPage.

- [ ] **Step 5: Verify vault CRUD**

Click "+ Add Entry". Fill in title and secret. Click "Save Entry". Expected: entry appears in list. Click "Delete". Expected: entry removed.

- [ ] **Step 6: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(desktop-app): smoke test fixes"
```
