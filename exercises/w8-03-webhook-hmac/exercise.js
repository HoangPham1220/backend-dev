// Đề bài: README.md cùng thư mục. Chấm: npm run check w8-03
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhook(rawBody, hmacHeader, secret) {
  // TODO
}

export async function readRawBody(req) {
  // TODO
}

export function createWebhookHandler({ secret, store, onOrder }) {
  // TODO: trả về async (req, res) => { ... }
}
