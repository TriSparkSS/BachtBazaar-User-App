import { API_BASE_URL } from '../config/api';
import { API_DEBUG } from '../config/debug';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
  baseUrl?: string;
}

type ApiLogPayload = Record<string, unknown>;

type NativeLoggingGlobal = typeof globalThis & {
  nativeLoggingHook?: (message: string, level: number) => void;
};

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

const formatLogValue = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const writeNativeApiLog = (message: string) => {
  const nativeLoggingHook = (globalThis as NativeLoggingGlobal).nativeLoggingHook;

  if (typeof nativeLoggingHook === 'function') {
    nativeLoggingHook(message, 2);
    return;
  }

  console.log(message);
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
  if (!API_DEBUG) {
    return;
  }

  if (payload === undefined) {
    writeNativeApiLog(`[API] ${label}`);
    return;
  }

  writeNativeApiLog(`[API] ${label} ${formatLogValue(redactForLogs(payload))}`);
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL || API_BASE_URL.includes('your-api-base-url.com')) {
    throw new Error(
      'API base URL is not configured. Update src/config/api.ts with your real backend URL.',
    );
  }

  let response: Response;
  const method = options.method ?? 'GET';
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const url = `${baseUrl}${path}`;
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
  let payload: unknown;

  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    const trimmed = text.trim();

    if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
      logApiEvent(`${method} invalid-response`, {
        url,
        path,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt,
        hint: 'Server returned HTML instead of JSON. Check API_BASE_URL uses https://',
        responsePreview: trimmed.slice(0, 120),
      });
      throw new Error(
        'Server returned an HTML page instead of API data. Ensure API_BASE_URL uses https://bachatbazaar.tech/api/user',
      );
    }

    payload = text;
  }

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
