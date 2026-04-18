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
