# SafePass — Encryption & Authentication Flow

## Overview

SafePass uses **end-to-end encryption (E2E)**. The master password never leaves the browser. The server only stores:
- A **salt** (random, used for key derivation)
- A **password hash** (SHA-256 of the derived key — for verification only)
- An **encrypted blob** (the vault data, opaque to the server)

## Cryptographic Primitives

| Purpose              | Algorithm          | Details                        |
|----------------------|--------------------|--------------------------------|
| Key derivation       | PBKDF2             | 600,000 iterations, SHA-256    |
| Encryption           | AES-256-GCM        | 256-bit key, 12-byte IV        |
| Verification hash    | SHA-256            | Hash of raw derived key bytes  |
| Random generation    | crypto.getRandomValues | For salt, IV, password gen  |

### Why these choices?
- **PBKDF2 at 600k iterations**: Matches OWASP 2023 recommendations for SHA-256. Slows brute-force attacks.
- **AES-256-GCM**: Authenticated encryption — provides both confidentiality and integrity. Detects tampering.
- **Web Crypto API**: Native browser implementation. No JS crypto library dependencies. Hardware-accelerated on most platforms.

## Flow 1: First-Time Setup

When no user exists, the app shows the Setup page.

```
┌─────────────────── BROWSER ───────────────────┐     ┌──── SERVER ────┐
│                                                │     │                │
│  1. User types master password + confirm       │     │                │
│                                                │     │                │
│  2. Generate random salt (16 bytes)            │     │                │
│     salt = crypto.getRandomValues(16)          │     │                │
│                                                │     │                │
│  3. Derive encryption key                      │     │                │
│     key = PBKDF2(password, salt, 600000)       │     │                │
│     → 256-bit AES-GCM CryptoKey               │     │                │
│                                                │     │                │
│  4. Create verification hash                   │     │                │
│     rawKey = exportKey(key)                    │     │                │
│     hash = SHA-256(rawKey) → base64            │     │                │
│                                                │     │                │
│  5. POST /api/auth/setup ──────────────────────┼────►│  6. Store:     │
│     { salt: base64, passwordHash: base64 }     │     │     salt       │
│                                                │     │     hash       │
│                                                │     │                │
│  8. Store key in memory (React ref) ◄──────────┼─────│  7. Return JWT │
│                                                │     │                │
│  9. Create empty vault                         │     │                │
│     vault = { entries: [], version: 1 }        │     │                │
│                                                │     │                │
│ 10. Encrypt vault                              │     │                │
│     iv = crypto.getRandomValues(12)            │     │                │
│     blob = AES-GCM-encrypt(vault, key, iv)     │     │                │
│                                                │     │                │
│ 11. PUT /api/vault ────────────────────────────┼────►│ 12. Store blob │
│     { encryptedData: base64, iv: base64 }      │     │     + iv       │
│                                                │     │                │
│ 13. Redirect to vault page                     │     │                │
└────────────────────────────────────────────────┘     └────────────────┘
```

**Key point**: The `password` and `key` never cross the network boundary. Only the `salt`, `hash`, and `encrypted blob` are sent to the server.

## Flow 2: Unlock (Returning User)

```
┌─────────────────── BROWSER ───────────────────┐     ┌──── SERVER ────┐
│                                                │     │                │
│  1. GET /api/auth/status ──────────────────────┼────►│ Return:        │
│                                                │◄────┼ initialized:   │
│                                                │     │ true           │
│                                                │     │                │
│  2. GET /api/auth/salt ────────────────────────┼────►│ Return salt    │
│                                                │◄────┼                │
│                                                │     │                │
│  3. User types master password                 │     │                │
│                                                │     │                │
│  4. Derive key with stored salt                │     │                │
│     key = PBKDF2(password, salt, 600000)       │     │                │
│                                                │     │                │
│  5. Hash the key                               │     │                │
│     hash = SHA-256(exportKey(key))             │     │                │
│                                                │     │                │
│  6. POST /api/auth/unlock ─────────────────────┼────►│  7. Compare    │
│     { passwordHash: base64 }                   │     │  hashes with   │
│                                                │     │  timingSafe    │
│                                                │     │  Equal()       │
│                                                │     │                │
│  9. Store key in memory ◄──────────────────────┼─────│  8. Return JWT │
│                                                │     │  (or 401)      │
│                                                │     │                │
│ 10. GET /api/vault ────────────────────────────┼────►│ 11. Return     │
│                                                │◄────┼ encrypted blob │
│                                                │     │                │
│ 12. Decrypt vault                              │     │                │
│     data = AES-GCM-decrypt(blob, key, iv)      │     │                │
│                                                │     │                │
│ 13. Vault entries now in memory                │     │                │
│     → Render vault UI                          │     │                │
└────────────────────────────────────────────────┘     └────────────────┘
```

**Wrong password**: The derived key will be different → hash won't match → server returns 401 → show error.

## Flow 3: Saving Vault Changes

Every time the user creates, edits, or deletes an entry:

```
┌─────────────────── BROWSER ───────────────────┐     ┌──── SERVER ────┐
│                                                │     │                │
│  1. User edits an entry in the UI              │     │                │
│                                                │     │                │
│  2. Update in-memory vault data                │     │                │
│                                                │     │                │
│  3. Generate FRESH IV (critical!)              │     │                │
│     iv = crypto.getRandomValues(12)            │     │                │
│                                                │     │                │
│  4. Re-encrypt entire vault                    │     │                │
│     blob = AES-GCM-encrypt(vault, key, iv)     │     │                │
│                                                │     │                │
│  5. PUT /api/vault ────────────────────────────┼────►│  6. Overwrite  │
│     { encryptedData: base64, iv: base64 }      │     │  stored blob   │
│                                                │     │                │
│  7. Show success toast ◄───────────────────────┼─────│  Return OK     │
└────────────────────────────────────────────────┘     └────────────────┘
```

**Why a fresh IV every time?** AES-GCM is catastrophically broken if the same (key, IV) pair is reused. A new random IV per save guarantees uniqueness.

**Why re-encrypt everything?** The server stores a single blob, not individual entries. This prevents metadata leakage (the server can't see which entry changed or how many exist).

## Flow 4: Lock

```
1. User clicks "Lock" button
2. Clear CryptoKey from memory (set ref to null)
3. Clear decrypted vault from memory
4. Clear JWT from memory
5. Redirect to /unlock page
```

The encrypted data remains safe on the server. Re-unlocking requires the master password again.

## Security Properties

| Property                   | How it's achieved                                            |
|----------------------------|--------------------------------------------------------------|
| Password never sent        | Only SHA-256(derivedKey) is sent; password stays in browser  |
| Server can't read vault    | AES-256-GCM encryption; server has no key                    |
| Brute-force resistance     | PBKDF2 600k iterations; ~300ms per attempt on modern hardware|
| Replay attack resistance   | JWT with expiry; fresh IV per encryption                     |
| Timing attack resistance   | Server uses crypto.timingSafeEqual for hash comparison       |
| Key not persisted          | Held in JS memory only; page refresh clears it               |
| Tampering detection        | AES-GCM is authenticated; modified ciphertext fails decrypt  |

## Crypto Implementation Reference

The core crypto module lives at `apps/client/src/lib/crypto.ts` and exports:

```typescript
// Key derivation
generateSalt(): Uint8Array
deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>
hashKey(key: CryptoKey): Promise<string>

// Vault encryption/decryption
encryptVault(data: VaultData, key: CryptoKey): Promise<{ encryptedData: string; iv: string }>
decryptVault(encryptedData: string, iv: string, key: CryptoKey): Promise<VaultData>

// Utilities
bufferToBase64(buffer: ArrayBuffer): string
base64ToBuffer(base64: string): Uint8Array
```

## Constants

```
PBKDF2_ITERATIONS = 600,000
KEY_LENGTH = 256 bits
IV_LENGTH = 12 bytes
SALT_LENGTH = 16 bytes
HASH_ALGORITHM = "SHA-256"
ENCRYPTION_ALGORITHM = "AES-GCM"
```
