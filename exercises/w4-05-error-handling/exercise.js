// Đề bài: README.md cùng thư mục. Chấm: npm run check w4-05

export const ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_ERROR',
};

export class HttpError extends Error {
  // TODO: constructor(status, message, details = null)
}

export class NotFoundError extends HttpError {
  // TODO
}

export class ValidationError extends HttpError {
  // TODO
}

export function errorHandler(err, req, res) {
  // TODO
}
