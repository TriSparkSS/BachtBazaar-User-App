import { API_BASE_URL } from '../config/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
}

type ApiLogPayload = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'firebasetoken',
  'newpassword',
  'oldpassword',
  'otp',
  'password',
  'token',
]);

const isSensitiveKey = (key?: string) =>
  Boolean(key && SENSITIVE_KEYS.has(key.toLowerCase()));

const redactForLogs = (value: unknown, key?: string): unknown => {
  if (isSensitiveKey(key)) {
    return '[REDACTED]';
  }

  if (value instanceof FormData) {
    return '[FormData payload]';
  }

  if (Array.isArray(value)) {
    return value.map(item => redactForLogs(item));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((sanitized, [entryKey, entryValue]) => {
      sanitized[entryKey] = redactForLogs(entryValue, entryKey);
      return sanitized;
    }, {});
  }

  return value;
};

const buildHeaders = (options: RequestOptions) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return headers;
};

export const logApiEvent = (label: string, payload?: ApiLogPayload) => {
  if (!__DEV__) {
    return;
  }

  if (payload === undefined) {
    console.log(`[API] ${label}`);
    return;
  }

  console.log(`[API] ${label}`, redactForLogs(payload));
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL || API_BASE_URL.includes('your-api-base-url.com')) {
    throw new Error(
      'API base URL is not configured. Update src/config/api.ts with your real backend URL.',
    );
  }

  let response: Response;
  const method = options.method ?? 'GET';
  const url = `${API_BASE_URL}${path}`;
  const startedAt = Date.now();
  const headers = buildHeaders(options);
  const requestBody = options.body ?? null;

  logApiEvent(`${method} request`, {
    url,
    path,
    method,
    headers,
    requestBody,
  });

  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        options.body == null
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    logApiEvent(`${method} network-error`, {
      url,
      path,
      method,
      durationMs: Date.now() - startedAt,
      error: message,
    });

    if (message.toLowerCase().includes('network request failed')) {
      throw new Error(
        'Could not reach your backend API. If the server is running on your computer, use 10.0.2.2 instead of localhost in src/config/api.ts.',
      );
    }

    throw error;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    logApiEvent(`${method} error-response`, {
      url,
      path,
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
      responseBody: payload,
    });
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  logApiEvent(`${method} response`, {
    url,
    path,
    method,
    status: response.status,
    durationMs: Date.now() - startedAt,
    responseBody: payload,
  });
  return payload as T;
}
