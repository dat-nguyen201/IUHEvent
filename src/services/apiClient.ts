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

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registers the auth context callback for invalidated remote sessions. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
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

    const rawText = await response.text().catch(() => '');
    let payload: ApiErrorPayload | null = null;
    try {
      payload = JSON.parse(rawText) as ApiErrorPayload;
    } catch {
      payload = rawText ? ({ message: rawText } as ApiErrorPayload) : null;
    }

    if (!response.ok) {
      const payloadCode = payload?.error?.code ?? payload?.code;
      const payloadMessage = payload?.error?.message ?? payload?.message;
      const code = typeof payloadCode === 'string'
        ? payloadCode
        : response.status === 401
          ? 'UNAUTHORIZED'
          : response.status === 403
            ? 'FORBIDDEN'
            : response.status === 404
              ? 'NOT_FOUND'
              : response.status === 409
                ? 'CONFLICT'
                : response.status === 429
                  ? 'TOO_MANY_REQUESTS'
                  : 'API_ERROR';

      const defaultMessage = response.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : response.status === 403
          ? 'Bạn không có quyền thực hiện thao tác này.'
          : response.status === 404
            ? 'Không tìm thấy dữ liệu yêu cầu.'
            : response.status === 429
              ? 'Thao tác quá nhanh. Vui lòng chờ giây lát.'
              : 'Yêu cầu chưa thực hiện được. Hãy thử lại.';

      const message = typeof payloadMessage === 'string' && payloadMessage.trim()
        ? payloadMessage
        : defaultMessage;

      if (__DEV__) {
        console.warn(`[apiClient] HTTP ${response.status} on ${options.method ?? 'GET'} ${path} -> [${code}]: ${message}`);
      }

      if (
        options.token &&
        (response.status === 401 || (response.status === 403 && code === 'ACCOUNT_SUSPENDED'))
      ) {
        unauthorizedHandler?.();
      }
      throw new ApiError(code, message, response.status);
    }

    return payload as T;
  } finally {
    clearTimeout(timeout);
  }
}
