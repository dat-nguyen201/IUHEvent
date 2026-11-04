export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
export const unauthorized = (code = 'UNAUTHORIZED', message = 'Bạn cần đăng nhập để tiếp tục.') =>
  new HttpError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'Bạn không có quyền thực hiện thao tác này.') =>
  new HttpError(403, code, message);
export const notFound = (code: string, message: string) => new HttpError(404, code, message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
