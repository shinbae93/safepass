# Desktop App Project Structure Design

Date: 2026-04-18

## Goal

Scaffold `apps/desktop-app/` as an Electron app using `electron-vite`, React 18 + Vite + Tailwind CSS + shadcn/ui in the renderer, with strict IPC security (contextIsolation, no nodeIntegration). The desktop app is the UI client — it calls the existing NestJS API at `apps/api` over HTTP. No backend is bundled into the Electron app.

## Folder Structure

```
apps/desktop-app/
├── package.json                   # @safepass/desktop-app
├── electron.vite.config.ts        # Three Vite configs: main, preload, renderer
├── tsconfig.json                  # Base TS config (references node + web)
├── tsconfig.node.json             # main + preload — Node target
├── tsconfig.web.json              # renderer — browser target
├── .env                           # VITE_API_URL=http://localhost:3000 (git-ignored)
├── .env.example                   # Committed template
├── .gitignore
│
├── resources/
│   └── icon.png                   # App icon
│
└── src/
    ├── main/
    │   └── index.ts               # BrowserWindow setup, app lifecycle
    │
    ├── preload/
    │   └── index.ts               # contextBridge — exposes electronAPI to renderer
    │
    └── renderer/
        ├── index.html
        └── src/
            ├── main.tsx           # React entry point
            ├── App.tsx            # Router root + route guards
            │
            ├── lib/
            │   ├── crypto.ts      # PBKDF2 key derivation + AES-256-GCM encrypt/decrypt
            │   └── api.ts         # fetch() wrapper reading VITE_API_URL
            │
            ├── context/
            │   └── AuthContext.tsx # CryptoKey ref + JWT in memory
            │
            ├── hooks/
            │   └── useVault.ts    # Vault CRUD + optimistic mutations + rollback
            │
            ├── pages/
            │   ├── SetupPage.tsx
            │   ├── UnlockPage.tsx
            │   └── VaultPage.tsx
            │
            ├── components/
            │   └── ui/            # shadcn/ui primitives
            │
            └── types/
                └── index.ts       # Shared TypeScript interfaces
```

## Process Architecture

### Main Process (`src/main/index.ts`)

- Creates a single `BrowserWindow` with strict security settings
- Loads renderer via electron-vite dev server in dev, built `index.html` in prod
- Handles app lifecycle: `app.whenReady()`, `window-all-closed`, `activate`
- No business logic — window management only

BrowserWindow config:
```
webPreferences:
  contextIsolation: true
  nodeIntegration: false
  sandbox: false
  preload: path.join(__dirname, '../preload/index.js')
```

### Preload Script (`src/preload/index.ts`)

- Runs in privileged context with Node/Electron API access
- Exposes a minimal typed surface to the renderer via `contextBridge.exposeInMainWorld('electronAPI', { ... })`
- Initial exposure: `{ getVersion: () => app.getVersion() }`
- Future native features (file save, tray, OS notifications) added here only — never via nodeIntegration

### Renderer (`src/renderer/src/`)

- Pure React app — unaware of Electron internals except `window.electronAPI`
- All API calls via `fetch()` to `import.meta.env.VITE_API_URL`
- Web Crypto API available in Electron's Chromium — all crypto stays in renderer
- React Router handles navigation with route guards

## Renderer App Design

### Routing

| Route     | Page       | Guard                                        |
|-----------|------------|----------------------------------------------|
| `/setup`  | SetupPage  | Only if `GET /api/auth/status` → `initialized: false` |
| `/unlock` | UnlockPage | Initialized but no CryptoKey in memory       |
| `/vault`  | VaultPage  | CryptoKey in memory + valid JWT              |

### AuthContext

Holds security state — never persisted to disk or localStorage:
- `cryptoKey` — React `ref` (not state), never serialized
- `jwt` — in memory only, set on unlock, cleared on lock
- `initialized` — fetched from API on app load

### useVault Hook

- Fetch encrypted blob → decrypt in renderer → expose plain entries to UI
- Optimistic mutations (add/edit/delete entry) with rollback on API failure
- Every mutation: re-encrypt full vault with fresh IV → `PUT /api/vault`

### Data Flow

```
Renderer fetch() ──► http://localhost:3000/api/...
                 ◄── JSON response

Crypto (stays in renderer):
  master password ──► PBKDF2(600k iterations) ──► CryptoKey (in ref)
  CryptoKey ──► AES-256-GCM decrypt ──► plain vault entries
  plain vault ──► AES-256-GCM encrypt (fresh IV) ──► PUT /api/vault
```

## Environment

- `.env` at `apps/desktop-app/` (git-ignored):
  ```
  VITE_API_URL=http://localhost:3000
  ```
- `.env.example` committed with the same key, no value filled in
- Renderer reads: `import.meta.env.VITE_API_URL`
- Main process does not need the API URL — all HTTP calls originate in renderer

## Dependencies

### Runtime
- `electron`
- `electron-vite`
- `react`, `react-dom`
- `react-router-dom`
- `tailwindcss`, `@tailwindcss/vite`
- `@radix-ui/*` (via shadcn/ui)

### Dev
- `@electron-toolkit/tsconfig`
- `@types/react`, `@types/react-dom`, `@types/node`
- `typescript`
- `vite`

## pnpm Workspace Integration

- Package name: `@safepass/desktop-app`
- Added to root `pnpm-workspace.yaml` under `packages`
- Root `package.json` scripts extended:
  - `dev:desktop` — `pnpm --filter @safepass/desktop-app dev`
  - `build:desktop` — `pnpm --filter @safepass/desktop-app build`

## Security Invariants

- `contextIsolation: true` and `nodeIntegration: false` are never changed
- All Node/Electron APIs exposed to renderer go through `contextBridge` only
- Master password and CryptoKey never leave the renderer process
- JWT stored in JS memory only — no localStorage, no disk persistence
- Every vault save uses a fresh IV
