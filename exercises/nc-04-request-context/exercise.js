// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-04
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export function runWithContext(ctx, fn) {
  // TODO
}

export function getContext() {
  // TODO
}

export function createLogger(write, { now = () => new Date().toISOString() } = {}) {
  // TODO
}

export function contextMiddleware({ generateId = randomUUID } = {}) {
  // TODO
}
