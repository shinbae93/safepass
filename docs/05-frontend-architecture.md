# SafePass — Frontend Architecture

React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui

## Routing

Using `react-router-dom` v6.

| Route      | Page          | Access     | Description                          |
|------------|---------------|------------|--------------------------------------|
| `/`        | Redirect      | Public     | Check status → redirect accordingly  |
| `/setup`   | SetupPage     | Public     | First-launch: create master password |
| `/unlock`  | UnlockPage    | Public     | Enter master password to unlock      |
| `/vault`   | VaultPage     | Protected  | Main vault UI (requires auth)        |

**Route guard logic** (in `App.tsx`):
1. On load, call `GET /api/auth/status`
2. If `initialized: false` → redirect to `/setup`
3. If `initialized: true` and not unlocked → redirect to `/unlock`
4. If unlocked (key in memory + valid JWT) → allow `/vault`

---

## Component Tree

```
App
├── AuthProvider                           # React context: key + JWT + auth state
│
├── Routes
│   ├── /setup → SetupPage
│   │   └── MasterPasswordForm             # password + confirm + strength indicator
│   │
│   ├── /unlock → UnlockPage
│   │   └── MasterPasswordForm             # password only + error state
│   │
│   └── /vault → VaultPage (protected)
│       └── Layout
│           ├── Header
│           │   ├── Logo + "SafePass"
│           │   ├── SearchInput             # filters entries client-side
│           │   └── LockButton              # clears key → /unlock
│           │
│           ├── Sidebar
│           │   ├── "All Items" link
│           │   ├── CategoryList
│           │   │   └── CategoryItem        # name + icon + entry count badge
│           │   ├── AddCategoryButton       # opens CategoryForm dialog
│           │   └── CategoryForm (dialog)   # create/edit category
│           │
│           └── MainContent
│               ├── Toolbar
│               │   ├── Sort dropdown
│               │   └── "Add Entry" button  # opens EntryForm dialog
│               │
│               ├── EntryList
│               │   └── EntryCard[]         # title, username, URL favicon
│               │       └── onClick → opens EntryDetail
│               │
│               ├── EntryDetail (sheet/panel)
│               │   ├── Title, username, URL
│               │   ├── Password field (masked + show/hide + copy)
│               │   ├── Notes
│               │   ├── Custom fields
│               │   ├── Edit button → EntryForm
│               │   └── Delete button (with confirm dialog)
│               │
│               └── EntryForm (dialog)
│                   ├── Title input
│                   ├── Username input
│                   ├── Password input + PasswordGenerator
│                   ├── URL input
│                   ├── Notes textarea
│                   ├── Category select
│                   └── CustomFields
│                       └── Dynamic rows: [key input] [value input] [remove]
```

---

## State Management

No Redux or Zustand. React Context + hooks are sufficient for this app.

### AuthContext (`context/auth-context.tsx`)

Holds the security-critical state:

```typescript
interface AuthContextValue {
  isInitialized: boolean | null;  // null = loading, true/false from /api/auth/status
  isUnlocked: boolean;            // true when key is in memory
  derivedKey: CryptoKey | null;   // held in a React ref (not state, to avoid serialization)
  token: string | null;           // JWT for API calls
  setup: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
}
```

**Why a ref for `derivedKey`?**
- `CryptoKey` objects are non-serializable. Storing in React state would trigger unnecessary re-renders.
- A `useRef` holds the key silently. Auth state changes (locked/unlocked) are tracked via a separate boolean state.

### useVault hook (`hooks/use-vault.ts`)

Manages the decrypted vault data:

```typescript
interface UseVaultReturn {
  entries: VaultEntry[];
  isLoading: boolean;
  error: string | null;

  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEntry: (id: string, updates: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  categories: Category[];
  addCategory: (name: string, icon?: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}
```

**How mutations work**:
1. Update in-memory entries array
2. Re-encrypt entire vault with fresh IV
3. `PUT /api/vault` with encrypted blob
4. On failure: rollback in-memory state, show error toast

---

## Key Components

### MasterPasswordForm
- **Setup mode**: Two fields (password + confirm), password strength indicator
- **Unlock mode**: Single field, error message on wrong password
- Shared component, mode determined by prop

### PasswordGenerator
- Embedded inside EntryForm (collapsible section)
- Configurable: length (slider 8-64), uppercase, lowercase, digits, symbols
- Uses `crypto.getRandomValues()` for true randomness
- "Generate" button → fills the password field
- Shows strength estimate

### EntryForm
- shadcn/ui Dialog component
- Used for both create and edit (pre-filled in edit mode)
- Custom fields section: dynamic list of key-value inputs with add/remove
- Category: dropdown populated from categories API
- Validation: title required, at least one of username/password/url/notes

### EntryCard
- Compact card in the list view
- Shows: title, username (masked or partial), URL domain
- Click to expand details
- Quick-action: copy password button

### Sidebar
- Fixed width, scrollable category list
- "All Items" always at top with total count
- Each category shows entry count (computed client-side from vault data)
- Right-click or menu icon: edit/delete category

---

## Styling Approach

- **Tailwind CSS** for all styling (no CSS modules or styled-components)
- **shadcn/ui** components: Button, Input, Dialog, Sheet, DropdownMenu, Select, Toast, Card, Badge
- **Dark mode**: Not in MVP, but Tailwind's dark mode classes make it easy to add later
- **Responsive**: Desktop-first (it's a local app), but basic mobile responsiveness via Tailwind breakpoints

---

## File Structure

```
apps/client/src/
├── main.tsx                        # ReactDOM.createRoot + App
├── App.tsx                         # Router + AuthProvider + route guards
├── index.css                       # Tailwind directives + global styles
│
├── lib/
│   ├── crypto.ts                   # Web Crypto API functions
│   ├── api.ts                      # HTTP client (fetch + JWT header)
│   └── utils.ts                    # cn() helper for shadcn/ui
│
├── context/
│   └── auth-context.tsx            # AuthProvider + useAuth hook
│
├── hooks/
│   └── use-vault.ts                # Vault state + CRUD + encrypt/decrypt
│
├── pages/
│   ├── setup.tsx                   # First-launch page
│   ├── unlock.tsx                  # Returning user unlock page
│   └── vault.tsx                   # Main vault page (layout + content)
│
├── components/
│   ├── ui/                         # shadcn/ui generated components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx / sonner.tsx
│   │   └── ...
│   ├── layout.tsx                  # Header + Sidebar + Main wrapper
│   ├── sidebar.tsx                 # Category navigation
│   ├── entry-list.tsx              # Scrollable list of EntryCards
│   ├── entry-card.tsx              # Single entry preview card
│   ├── entry-detail.tsx            # Full entry view (Sheet panel)
│   ├── entry-form.tsx              # Create/edit entry dialog
│   ├── category-form.tsx           # Create/edit category dialog
│   ├── password-generator.tsx      # Password generation controls
│   └── master-password-form.tsx    # Setup/unlock form
│
└── types/
    └── index.ts                    # VaultData, VaultEntry, CustomField, Category
```
