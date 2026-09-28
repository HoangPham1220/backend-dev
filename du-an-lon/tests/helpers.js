// Harness chung cho test nghiệm thu. Test chỉ nói chuyện với app qua HTTP,
// nên bạn cài đặt bằng node:http, Express hay DB nào cũng được, miễn đúng SPEC.md.
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Giá trị cố định cho môi trường test, đặt trước khi import app.
export const TEST_ENV = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret-khong-dung-o-production',
  WEBHOOK_SECRET: 'test-webhook-secret',
  ADMIN_EMAIL: 'admin@shop.test',
  ADMIN_PASSWORD: 'Admin@12345',
  // Mốc nâng cao M8: ngưỡng tồn kho thấp và thời gian chờ gửi lại sự kiện (đặt thấp để test chạy nhanh).
  LOW_STOCK_THRESHOLD: '5',
  EVENT_RETRY_BASE_MS: '20',
};
Object.assign(process.env, TEST_ENV);

const entry = process.env.APP_ENTRY
  ? resolve(process.env.APP_ENTRY)
  : resolve(dirname(fileURLToPath(import.meta.url)), '../src/app.js');

let modulePromise;
function loadAppModule() {
  modulePromise ??= import(pathToFileURL(entry).href);
  return modulePromise;
}

// Khởi một app mới (dữ liệu trống), listen port ngẫu nhiên, tự đóng khi test kết thúc.
// Sau khi có auth (M3), ctx.adminToken / ctx.customerToken có giá trị; trước đó là null
// và request được gửi không kèm token, nên test M1/M2 chạy được ở cả hai giai đoạn.
export async function useApp(t) {
  const mod = await loadAppModule();
  if (typeof mod.createApp !== 'function') {
    throw new Error(`${entry} phải export async function createApp()`);
  }
  const app = await mod.createApp();

  let server;
  if (app instanceof http.Server) server = app;
  else if (typeof app === 'function') server = http.createServer(app);
  else throw new Error('createApp() phải trả về Express app (function) hoặc http.Server chưa listen');

  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', ok);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const ctx = {
    baseUrl,
    authEnabled: false,
    adminToken: null,
    customerToken: null,
    request: (method, path, options) => request(baseUrl, method, path, options),
  };

  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((done) => server.close(done));
    if (typeof mod.closeApp === 'function') await mod.closeApp(app);
  });

  await detectAuth(ctx);
  return ctx;
}

// Gửi request. body -> JSON.stringify; raw -> gửi nguyên chuỗi (dùng cho JSON hỏng, webhook).
export async function request(baseUrl, method, path, { body, raw, token, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  let payload;
  if (raw !== undefined) {
    payload = raw;
    finalHeaders['content-type'] ??= 'application/json';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    finalHeaders['content-type'] = 'application/json';
  }
  if (token) finalHeaders.authorization = `Bearer ${token}`;

  const res = await fetch(baseUrl + path, { method, headers: finalHeaders, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, body: json, text };
}

async function detectAuth(ctx) {
  const res = await ctx.request('POST', '/auth/login', {
    body: { email: TEST_ENV.ADMIN_EMAIL, password: TEST_ENV.ADMIN_PASSWORD },
  });
  if (res.status === 404) return; // Chưa làm M3.
  assert.equal(
    res.status,
    200,
    `POST /auth/login bằng ADMIN_EMAIL/ADMIN_PASSWORD phải trả 200 (M3: seed admin khi createApp). Nhận ${res.status}: ${res.text}`,
  );
  ctx.authEnabled = true;
  ctx.adminToken = res.body?.data?.token;
  assert.ok(ctx.adminToken, 'login phải trả { data: { token, user } }');
  ctx.customerToken = (await registerAndLogin(ctx, 'khach@shop.test')).token;
}

export async function registerAndLogin(ctx, email, password = 'Matkhau@123', name = 'Khách Test') {
  const reg = await ctx.request('POST', '/auth/register', { body: { email, password, name } });
  assert.equal(reg.status, 201, `đăng ký ${email} phải 201, nhận ${reg.status}: ${reg.text}`);
  const login = await ctx.request('POST', '/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `đăng nhập ${email} phải 200, nhận ${login.status}: ${login.text}`);
  return { token: login.body.data.token, user: login.body.data.user };
}

// Kiểm tra định dạng lỗi thống nhất { error: { code, message, details? } }.
export function assertError(res, status, code, hint = '') {
  const where = hint ? ` (${hint})` : '';
  assert.equal(res.status, status, `mong đợi HTTP ${status}${where}, nhận ${res.status}: ${res.text}`);
  assert.ok(res.body && typeof res.body.error === 'object', `body lỗi phải có dạng { error: {...} }${where}, nhận: ${res.text}`);
  assert.equal(res.body.error.code, code, `error.code phải là ${code}${where}`);
  assert.equal(typeof res.body.error.message, 'string', `error.message phải là chuỗi${where}`);
}

export function errorFields(res) {
  return (res.body?.error?.details ?? []).map((detail) => detail.field);
}

export async function createProduct(ctx, overrides = {}) {
  const body = { sku: `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, name: 'Sản phẩm test', price: 100000, ...overrides };
  const res = await ctx.request('POST', '/products', { body, token: ctx.adminToken });
  assert.equal(res.status, 201, `tạo sản phẩm phải 201, nhận ${res.status}: ${res.text}`);
  return res.body.data;
}

export async function adjustStock(ctx, productId, quantity, reason = 'nhập kho test') {
  const res = await ctx.request('POST', '/inventory/adjustments', {
    body: { productId, quantity, reason },
    token: ctx.adminToken,
  });
  assert.equal(res.status, 201, `điều chỉnh kho phải 201, nhận ${res.status}: ${res.text}`);
  return res.body.data;
}

export async function getStock(ctx, productId) {
  const res = await ctx.request('GET', `/products/${productId}`);
  assert.equal(res.status, 200, `GET /products/${productId} phải 200, nhận ${res.status}`);
  return res.body.data.stock;
}

export function signWebhook(rawBody, secret = TEST_ENV.WEBHOOK_SECRET) {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
}

export const TEST_TIMEOUT = { timeout: 10_000 };

// ---- Helper cho các mốc nâng cao (M6–M8) ----

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// Như useApp nhưng yêu cầu đã làm M3 (auth). Dùng cho mốc cần token admin/khách.
export async function useAuthApp(t, milestone) {
  const ctx = await useApp(t);
  assert.ok(ctx.authEnabled, `${milestone} cần làm xong M3 (auth) trước: POST /auth/login với ADMIN_EMAIL/ADMIN_PASSWORD đang trả 404`);
  return ctx;
}

// Chờ tới khi check() trả true (dùng cho việc chạy nền). Quá timeout thì test trượt với message.
export async function waitFor(check, { timeout = 3000, interval = 20, message = 'hết thời gian chờ' } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(interval);
  }
  assert.fail(`${message} (đã chờ ${timeout}ms)`);
}

// Server nhận webhook giả: ghi lại mọi request. respond(entry, lần thứ mấy) trả status code, mặc định 200.
export async function startReceiver(t, respond = () => 200) {
  const received = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let body = null;
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = null;
      }
      const entry = { method: req.method, headers: req.headers, rawBody, body };
      received.push(entry);
      res.writeHead(respond(entry, received.length), { 'content-type': 'application/json' }).end('{}');
    });
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((done) => server.close(done));
  });
  return { url: `http://127.0.0.1:${server.address().port}/hooks`, received };
}
