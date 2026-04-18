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
