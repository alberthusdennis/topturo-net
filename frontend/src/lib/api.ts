import { tokenManager } from './tokenManager';

const BASE_URL = 'http://localhost:3001';

type RequestOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;

  const token = tokenManager.get();
  console.log(`[API REQUEST] to ${path}. Token exists: ${!!token}`);

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> || {}),
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    ...rest,
    headers: reqHeaders,
  };

  if (json !== undefined) {
    init.body = JSON.stringify(json);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, init);
  } catch (networkErr) {
    throw new ApiError(0, 'Tidak bisa terhubung ke server. Pastikan backend berjalan.');
  }

  if (res.status === 401) {
    tokenManager.clear();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError(401, 'Sesi habis. Silakan login kembali.');
  }

  if (!res.ok) {
    let errorMsg = `Server error: ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.error === 'string') {
        errorMsg = body.error;
      } else if (body.error?.issues?.[0]?.message) {
        // Zod validation error from hono/zValidator — extract human-readable message
        errorMsg = body.error.issues[0].message;
      } else if (body.message && typeof body.message === 'string') {
        errorMsg = body.message;
      }
    } catch {}
    throw new ApiError(res.status, errorMsg);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: 'GET',    ...opts }),
  post:   <T>(path: string, json?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'POST',   json, ...opts }),
  put:    <T>(path: string, json?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'PUT',    json, ...opts }),
  patch:  <T>(path: string, json?: unknown, opts?: RequestOptions) => request<T>(path, { method: 'PATCH',  json, ...opts }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { method: 'DELETE', ...opts }),
};
