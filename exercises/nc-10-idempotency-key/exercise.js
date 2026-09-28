// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-10

// Có sẵn, không cần sửa. Dùng: throw new IdempotencyError(422, 'Key đã dùng cho request khác');
export class IdempotencyError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'IdempotencyError';
    this.status = status;
  }
}

export function createIdempotencyStore(db, { ttlMs = 86_400_000, now = () => Date.now() } = {}) {
  // TODO
}

export async function handleIdempotent(store, key, requestHash, fn) {
  // TODO
}
