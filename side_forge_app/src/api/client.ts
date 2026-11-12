import { ENV, STORAGE_KEYS } from '@/constants/env';
import { secureStorage } from '@/utils/secureStorage';
import type { ApiResponse, ErrorResponse } from '@/types/api';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly errors: string[];

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    errors: string[] = []
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorizedSession(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener errors
    }
  });
}

export function getActiveApiBaseUrl(): string {
  return ENV.DEFAULT_API_BASE_URL;
}


function extractJwtFromSetCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/(?:^|[,;\s])jwt=([^;,\s]+)/i);
  return match && match[1] ? match[1] : null;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  organizationId?: number | null;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipUnauthorizedRedirect?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    body,
    organizationId,
    timeoutMs = ENV.REQUEST_TIMEOUT_MS,
    skipAuth = false,
    skipUnauthorizedRedirect = false,
    headers: customHeaders,
    ...rest
  } = options;

  const baseUrl = getActiveApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = secureStorage.getSync(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `jwt=${token}`;
    }
  }

  const storedOrg = secureStorage.getSync(STORAGE_KEYS.ACTIVE_ORG_ID);
  const resolvedOrgId = organizationId ?? (storedOrg ? Number(storedOrg) : null);
  if (resolvedOrgId && !Number.isNaN(resolvedOrgId)) {
    headers['X-Organization-Id'] = String(resolvedOrgId);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      credentials: 'include',
      signal: controller.signal,
      body:
        body === undefined
          ? undefined
          : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiClientError(
        `Request timed out connecting to ${baseUrl}.`,
        0,
        'TIMEOUT_ERROR'
      );
    }
    throw new ApiClientError(
      `Cannot reach Side Forge server (${baseUrl}). Verify the server URL and network connection.`,
      0,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timer);
  }

  const cookieToken =
    response.headers.get('x-auth-token') ||
    extractJwtFromSetCookie(response.headers.get('set-cookie'));
  if (cookieToken) {
    await secureStorage.setAsync(STORAGE_KEYS.ACCESS_TOKEN, cookieToken);
  }

  const contentType = response.headers.get('content-type') || '';
  let parsedBody: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    const errPayload = parsedBody as Partial<ErrorResponse & ApiResponse> | null;
    const message =
      errPayload?.message ||
      errPayload?.errors?.[0] ||
      `Request failed (${response.status})`;
    let code: ApiErrorCode = 'SERVER_ERROR';
    if (response.status === 401) {
      code = 'UNAUTHORIZED';
      if (!skipUnauthorizedRedirect) notifyUnauthorized();
    } else if (response.status === 403) code = 'FORBIDDEN';
    else if (response.status === 404) code = 'NOT_FOUND';
    else if (response.status === 400 || response.status === 422) {
      code = 'VALIDATION_ERROR';
    }
    throw new ApiClientError(message, response.status, code, errPayload?.errors ?? []);
  }

  const apiResponse = (parsedBody ?? { success: true, message: 'OK' }) as ApiResponse<T>;
  const maybeToken = (apiResponse.data as { accessToken?: string } | undefined)?.accessToken;
  if (typeof maybeToken === 'string' && maybeToken.length > 0) {
    await secureStorage.setAsync(STORAGE_KEYS.ACCESS_TOKEN, maybeToken);
  }

  return apiResponse;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
