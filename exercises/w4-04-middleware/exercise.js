// Đề bài: README.md cùng thư mục. Chấm: npm run check w4-04
import { randomUUID } from 'node:crypto';

export function compose(middlewares) {
  // TODO: trả về hàm (req, res) => Promise
}

export function requestId() {
  // TODO: trả về middleware (req, res, next)
}

export function logger(logFn) {
  // TODO: trả về middleware (req, res, next)
}
