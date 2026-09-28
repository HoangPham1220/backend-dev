// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-09
// db là DatabaseSync của node:sqlite, bảng products đã được tạo.

// Có sẵn, không cần sửa. Dùng: throw new ConflictError('Xung đột phiên bản', currentVersion);
export class ConflictError extends Error {
  constructor(message, currentVersion) {
    super(message);
    this.name = 'ConflictError';
    this.currentVersion = currentVersion;
  }
}

export function getProduct(db, id) {
  // TODO
}

export function updateProductPrice(db, { id, price, expectedVersion }) {
  // TODO
}

export async function withRetryOnConflict(fn, { retries = 3 } = {}) {
  // TODO
}
