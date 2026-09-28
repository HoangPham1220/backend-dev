// Đề bài: README.md cùng thư mục. Chấm: npm run check w8-04

export function authenticate(verifyToken) {
  // TODO: trả về (req, res, next) => { ... }
}

export function authorize(...roles) {
  // TODO: trả về (req, res, next) => { ... }
}

export function rateLimit({ windowMs, max, now = Date.now, keyOf = (req) => req.ip }) {
  // TODO: trả về (req, res, next) => { ... }
}
