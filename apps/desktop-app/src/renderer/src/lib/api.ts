import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  TokenResponse,
  SaltResponse,
  VaultEntry,
  CreateVaultEntryRequest,
  UpdateVaultEntryRequest,
} from '@renderer/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = options.method ?? 'GET';
  console.debug(`[api] ${method} ${BASE_URL}/api${path}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  } catch (err) {
    console.error(`[api] ${method} ${path} — network error:`, err);
    throw err;
  }

  if (!response.ok) {
    const error = await response.text();
    console.error(`[api] ${method} ${path} — ${response.status}:`, error);
    throw new Error(error || `HTTP ${response.status}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSalt: (query: { userId?: string; username?: string }) => {
    const params = new URLSearchParams();
    if (query.userId) params.set('userId', query.userId);
    if (query.username) params.set('username', query.username);
    return request<SaltResponse>(`/auth/salt?${params.toString()}`);
  },

  register: (body: RegisterRequest) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getVaultEntries: (token: string) =>
    request<VaultEntry[]>('/vault', {}, token),

  getVaultEntry: (id: string, token: string) =>
    request<VaultEntry>(`/vault/${id}`, {}, token),

  createVaultEntry: (body: CreateVaultEntryRequest, token: string) =>
    request<VaultEntry>('/vault', { method: 'POST', body: JSON.stringify(body) }, token),

  updateVaultEntry: (id: string, body: UpdateVaultEntryRequest, token: string) =>
    request<VaultEntry>(`/vault/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteVaultEntry: (id: string, token: string) =>
    request<void>(`/vault/${id}`, { method: 'DELETE' }, token),
};
