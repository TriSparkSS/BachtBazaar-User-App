import { API_BASE_URL } from '../config/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
  headers?: Record<string, string>;
}

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

const logApiEvent = (label: string, path: string, payload?: unknown) => {
  if (!__DEV__) {
    return;
  }

  if (payload === undefined) {
    console.log(`[API] ${label} ${path}`);
    return;
  }

  console.log(`[API] ${label} ${path}`, payload);
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL || API_BASE_URL.includes('your-api-base-url.com')) {
    throw new Error(
      'API base URL is not configured. Update src/config/api.ts with your real backend URL.',
    );
  }

  let response: Response;
  const method = options.method ?? 'GET';
  const requestBody =
    options.body instanceof FormData ? '[FormData payload]' : options.body ?? null;

  logApiEvent(`${method} request`, path, requestBody);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(options),
      body:
        options.body == null
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    logApiEvent(`${method} network-error`, path, message);

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
    logApiEvent(`${method} error-response`, path, payload);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  logApiEvent(`${method} response`, path, payload);
  return payload as T;
}
