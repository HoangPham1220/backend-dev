// Bạn viết test tích hợp cho lib/app.js ở file này. Đặc tả: README.md.
// Chạy nhanh: node --test exercises/w9-02-test-api/my.test.js
// Chấm (chạy với bản đúng + 5 mutant): npm run check w9-02
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Dòng này cho phép bộ chấm thay bản cài đặt bằng các mutant. Giữ nguyên.
const { createApp } = await import(process.env.APP_IMPL ?? './lib/app.js');

// --- Phần dựng server có sẵn: mỗi test một server mới, dữ liệu trống. ---
let server;
let baseUrl;

beforeEach(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(() => {
  server.closeAllConnections();
  server.close();
});

function createCustomer(body) {
  return fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
// --- Hết phần có sẵn. ---

test('tạo khách hàng trả về email vừa tạo', async () => {
  const res = await createCustomer({ email: 'lan@shop.vn', name: 'Lan', password: 'matkhau123' });
  const body = await res.json();
  assert.equal(body.email, 'lan@shop.vn');
});

// TODO: viết thêm test cho từng dòng trong bảng đặc tả.
