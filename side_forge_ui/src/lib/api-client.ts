/**
 * Centralized API Client for Side_forge Admin Web.
 * Connects to the Spring Boot backend using HttpOnly JWT cookies (`credentials: 'include'`).
 */

export interface BackendApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly fieldErrors?: Record<string, string>;
  public readonly raw?: unknown;

  constructor(
    message: string,
    status: number,
    options?: { fieldErrors?: Record<string, string>; raw?: unknown }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = options?.fieldErrors;
    this.raw = options?.raw;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const AUTH_UNAUTHORIZED_EVENT = 'sideforge:auth-unauthorized';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  suppressUnauthorizedEvent?: boolean;
  timeoutMs?: number;
}

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = `${API_BASE_URL}${normalizedPath}`;
  if (!params) return base;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return (await response.text()) || null;
  } catch {
    return null;
  }
}

function extractErrorDetails(status: number, payload: unknown) {
  const fieldErrors: Record<string, string> = {};
  let message = '';

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) message = obj.message.trim();
    else if (typeof obj.error === 'string' && obj.error.trim()) message = obj.error.trim();

    if (Array.isArray(obj.errors)) {
      for (const item of obj.errors) {
        if (item && typeof item === 'object') {
          const err = item as { field?: string; defaultMessage?: string; message?: string };
          if (err.field) fieldErrors[err.field] = err.defaultMessage || err.message || 'Invalid value';
        }
      }
    } else if (obj.fieldErrors && typeof obj.fieldErrors === 'object') {
      for (const [k, v] of Object.entries(obj.fieldErrors as Record<string, unknown>)) {
        if (typeof v === 'string') fieldErrors[k] = v;
      }
    }
  }

  if (!message) {
    const defaults: Record<number, string> = {
      400: 'Invalid request. Please check your input and try again.',
      401: 'Your session has expired or you are not signed in.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource could not be found.',
      409: 'This action conflicts with existing data.',
    };
    message = defaults[status] || 'An unexpected server error occurred. Please try again.';
  }

  return {
    message,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers, suppressUnauthorizedEvent, timeoutMs = 10000, ...rest } = options;
  const url = buildUrl(endpoint, params);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Accept')) requestHeaders.set('Accept', 'application/json');
  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      signal: rest.signal || controller.signal,
      credentials: 'include',
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const isTimeout = networkErr instanceof DOMException && networkErr.name === 'AbortError';
    throw new ApiError(
      isTimeout
        ? 'Request timed out while connecting to the Side_forge server.'
        : 'Unable to connect to the Side_forge server. Please ensure the backend is running on port 8080.',
      0,
      { raw: networkErr }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new ApiError(
      'Backend API is unreachable (received HTML instead of JSON). Ensure the Spring Boot server is running.',
      502
    );
  }

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    if (response.status === 401 && !suppressUnauthorizedEvent && !endpoint.startsWith('/api/auth/login')) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }
    const { message, fieldErrors } = extractErrorDetails(response.status, payload);
    throw new ApiError(message, response.status, { fieldErrors, raw: payload });
  }

  if (payload && typeof payload === 'object' && 'success' in (payload as Record<string, unknown>)) {
    const envelope = payload as BackendApiResponse<T>;
    if (!envelope.success) {
      throw new ApiError(envelope.message || 'Operation failed', response.status, { raw: payload });
    }
    return (envelope.data !== undefined ? envelope.data : (envelope as unknown)) as T;
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

