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
