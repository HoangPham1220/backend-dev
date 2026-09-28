// Đề bài: README.md cùng thư mục. Chấm: npm run check w8-02
import { createHmac, timingSafeEqual } from 'node:crypto';

// Có sẵn, không cần sửa. Dùng: throw new JwtError('EXPIRED', 'Token đã hết hạn');
export class JwtError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'JwtError';
    this.code = code;
  }
}

export function sign(payload, secret, { expiresInSec = 3600, now = Math.floor(Date.now() / 1000) } = {}) {
  // TODO
}

export function verify(token, secret, { now = Math.floor(Date.now() / 1000) } = {}) {
  // TODO
}
