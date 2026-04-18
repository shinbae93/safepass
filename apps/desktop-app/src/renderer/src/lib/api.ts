import type {
  SetupRequest,
  UnlockRequest,
  TokenResponse,
  SaltResponse,
  VaultResponse,
  VaultUpdateRequest,
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
  getSalt: (username: string) =>
    request<SaltResponse>(`/auth/salt?username=${encodeURIComponent(username)}`),

  setup: (body: SetupRequest) =>
    request<TokenResponse>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  unlock: (body: UnlockRequest) =>
    request<TokenResponse>('/auth/unlock', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getVault: (token: string) => request<VaultResponse>('/vault', {}, token),

  putVault: (body: VaultUpdateRequest, token: string) =>
    request<void>('/vault', { method: 'PUT', body: JSON.stringify(body) }, token),
};
