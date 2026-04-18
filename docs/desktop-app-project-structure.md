# Desktop App Project Structure

Electron desktop client for SafePass. Uses `electron-vite` with React 18 + Vite + Tailwind CSS + shadcn/ui in the renderer. Calls the NestJS API (`apps/api`) over HTTP — no backend bundled.

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

## Process Model

| Process  | Entry                    | Role |
|----------|--------------------------|------|
| Main     | `src/main/index.ts`      | BrowserWindow lifecycle, no business logic |
| Preload  | `src/preload/index.ts`   | contextBridge — typed bridge between main and renderer |
| Renderer | `src/renderer/src/main.tsx` | React UI, fetch() to API, all crypto |

## Security Config

```
BrowserWindow webPreferences:
  contextIsolation: true
  nodeIntegration: false
  sandbox: false
  preload: path.join(__dirname, '../preload/index.js')
```

## Routing

| Route     | Page       | Condition |
|-----------|------------|-----------|
| `/setup`  | SetupPage  | `GET /api/auth/status` → `initialized: false` |
| `/unlock` | UnlockPage | Initialized, no CryptoKey in memory |
| `/vault`  | VaultPage  | CryptoKey in memory + valid JWT |

## Environment

`.env` (git-ignored):
```
VITE_API_URL=http://localhost:3000
```

Renderer reads `import.meta.env.VITE_API_URL`. Main process does not use the API URL.

## pnpm Workspace Scripts

From repo root:
```bash
pnpm dev:desktop    # Start Electron in dev mode (hot reload)
pnpm build:desktop  # Production build
```
