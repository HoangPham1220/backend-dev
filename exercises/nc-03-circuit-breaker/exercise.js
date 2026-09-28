// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-03

export class CircuitOpenError extends Error {
  constructor(message = 'Circuit đang mở, từ chối gọi') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export function createCircuitBreaker(
  fn,
  { failureThreshold = 5, resetTimeoutMs = 10_000, now = () => Date.now(), onStateChange = () => {} } = {},
) {
  // TODO
}
