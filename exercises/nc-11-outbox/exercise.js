// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-11

export function placeOrderWithOutbox(db, order, { now = () => new Date().toISOString() } = {}) {
  // TODO
}

export function createOutboxRelay(db, publish, { batchSize = 10, maxAttempts = 5, now = () => new Date().toISOString() } = {}) {
  // TODO
}
