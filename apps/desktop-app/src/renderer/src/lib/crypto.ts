const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 256;

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function hashKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', exported);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string,
): Promise<{ encryptedData: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decrypt(key: CryptoKey, encryptedData: string, iv: string): Promise<string> {
  const ciphertextBytes = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertextBytes,
  );
  return new TextDecoder().decode(plaintext);
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt));
}

export function base64ToSalt(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
