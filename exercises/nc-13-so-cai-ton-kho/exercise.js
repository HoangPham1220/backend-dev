// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-13

export function recordMovement(db, { sku, delta, reason, ref = null, now }) {
  // TODO
}

export function getStock(db, sku, { at } = {}) {
  // TODO
}

export function createSnapshot(db, sku, now) {
  // TODO
}

export function reconcile(db, sku, countedQty, { ref, now }) {
  // TODO
}

export function history(db, sku) {
  // TODO
}
