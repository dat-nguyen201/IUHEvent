const REQUEST_TIMEOUT_MS = 10_000;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

type ApiErrorPayload = {
  code?: unknown;
  message?: unknown;
  error?: { code?: unknown; message?: unknown };
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new ApiError(
      'API_CONFIG_MISSING',
      'Chưa cấu hình địa chỉ máy chủ. Hãy kiểm tra EXPO_PUBLIC_API_URL.',
    );
  }

  return API_BASE_URL;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('REQUEST_TIMEOUT', 'Máy chủ phản hồi quá lâu. Hãy thử lại.');
      }
      throw new ApiError('NETWORK_ERROR', 'Không thể kết nối máy chủ. Hãy kiểm tra mạng và thử lại.');
    }

    const payload = await response.json().catch(() => null) as ApiErrorPayload | null;
    if (!response.ok) {
      const payloadCode = payload?.error?.code ?? payload?.code;
      const payloadMessage = payload?.error?.message ?? payload?.message;
      const code = typeof payloadCode === 'string'
        ? payloadCode
        : response.status === 401
          ? 'UNAUTHORIZED'
          : response.status === 403
            ? 'FORBIDDEN'
            : response.status === 409
              ? 'CONFLICT'
              : 'API_ERROR';
      const message = typeof payloadMessage === 'string'
        ? payloadMessage
        : 'Yêu cầu chưa thực hiện được. Hãy thử lại.';
      throw new ApiError(code, message, response.status);
    }

    return payload as T;
  } finally {
    clearTimeout(timeout);
  }
}
