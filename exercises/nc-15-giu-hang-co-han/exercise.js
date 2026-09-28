// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-15

export function available(db, sku, now) {
  // TODO
}

export function reserve(db, { sku, qty, cartId, now, ttlMs = 900_000 }) {
  // TODO
}

export function confirm(db, reservationId, now) {
  // TODO
}

export function release(db, reservationId) {
  // TODO
}

export function expireReservations(db, now) {
  // TODO
}
