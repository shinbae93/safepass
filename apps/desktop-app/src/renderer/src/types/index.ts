export interface VaultEntry {
  id: string;
  title: string;
  value: string;
  notes: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
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
