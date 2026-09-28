// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-12

export function enqueue(db, type, payload, { runAt = 0, maxAttempts = 3 } = {}) {
  // TODO
}

export function createWorker(
  db,
  handlers,
  { now = () => Date.now(), visibilityTimeoutMs = 30_000, backoff = (attempts) => 1000 * 2 ** (attempts - 1) } = {},
) {
  // TODO
}

export function stats(db) {
  // TODO
}
