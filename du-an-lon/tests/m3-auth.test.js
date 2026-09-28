// M3 · Xác thực và phân quyền (tuần 8). Chạy: npm run du-an m3
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { useApp, assertError, registerAndLogin, createProduct, adjustStock, TEST_ENV, TEST_TIMEOUT } from './helpers.js';

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
function signJwt(payload, secret = TEST_ENV.JWT_SECRET, header = { alg: 'HS256', typ: 'JWT' }) {
  const body = `${b64url(header)}.${b64url(payload)}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
const decode = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

// Không response nào được chứa mật khẩu hay hash, ở bất kỳ độ sâu nào.
function assertNoSecrets(res, password) {
  assert.ok(!res.text.includes(password), 'response không được chứa mật khẩu gốc');
  const walk = (value, path) => {
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        assert.ok(!/pass|hash|salt/i.test(key), `response lộ trường nhạy cảm "${path}.${key}"`);
        walk(child, `${path}.${key}`);
      }
    }
  };
  walk(res.body, 'body');
}

async function authApp(t) {
  const ctx = await useApp(t);
  assert.ok(ctx.authEnabled, 'M3 chưa có: POST /auth/login với ADMIN_EMAIL/ADMIN_PASSWORD đang trả 404');
  return ctx;
}

test('POST /auth/register tạo khách hàng, chuẩn hoá email, không lộ mật khẩu', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const password = 'Matkhau@123';
  const res = await ctx.request('POST', '/auth/register', { body: { email: '  An.Nguyen@Example.COM ', password, name: 'Nguyễn An' } });
  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.email, 'an.nguyen@example.com', 'email được trim và chuyển chữ thường');
  assert.equal(res.body.data.role, 'customer', 'tự đăng ký luôn là customer, không tự chọn role');
  assert.equal(res.body.data.name, 'Nguyễn An');
  assert.ok(res.body.data.id !== undefined);
  assertNoSecrets(res, password);
});

test('POST /auth/register không cho tự đặt role admin', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const res = await ctx.request('POST', '/auth/register', {
    body: { email: 'hacker@example.com', password: 'Matkhau@123', name: 'H', role: 'admin' },
  });
  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.role, 'customer', 'trường role từ client phải bị bỏ qua (mass assignment)');
});

test('POST /auth/register: validate và email trùng', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const register = (body) => ctx.request('POST', '/auth/register', { body });
  assertError(await register({ email: 'khong-phai-email', password: 'Matkhau@123', name: 'A' }), 422, 'VALIDATION_ERROR', 'email sai định dạng');
  assertError(await register({ email: 'a@example.com', password: 'ngan', name: 'A' }), 422, 'VALIDATION_ERROR', 'mật khẩu dưới 8 ký tự');
  assertError(await register({ email: 'a@example.com', password: 'Matkhau@123' }), 422, 'VALIDATION_ERROR', 'thiếu name');
  await register({ email: 'b@example.com', password: 'Matkhau@123', name: 'B' });
  assertError(await register({ email: 'B@EXAMPLE.com', password: 'Matkhau@123', name: 'B2' }), 409, 'CONFLICT', 'email trùng không phân biệt hoa thường');
});

test('POST /auth/login trả JWT HS256 có sub, role, exp', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const password = 'Matkhau@123';
  await ctx.request('POST', '/auth/register', { body: { email: 'c@example.com', password, name: 'C' } });
  const res = await ctx.request('POST', '/auth/login', { body: { email: 'C@example.com', password } });
  assert.equal(res.status, 200, res.text);
  const { token, user } = res.body.data;
  assert.equal(token.split('.').length, 3, 'token phải có dạng JWT header.payload.signature');
  const claims = decode(token);
  assert.equal(String(claims.sub), String(user.id), 'claim sub là id người dùng');
  assert.equal(claims.role, 'customer');
  assert.ok(Number.isInteger(claims.exp) && claims.exp > Date.now() / 1000, 'exp (giây) phải ở tương lai');
  assertNoSecrets(res, password);
});

test('POST /auth/login sai thông tin trả 401 như nhau, không tiết lộ email có tồn tại hay không', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  await ctx.request('POST', '/auth/register', { body: { email: 'd@example.com', password: 'Matkhau@123', name: 'D' } });
  const wrongPassword = await ctx.request('POST', '/auth/login', { body: { email: 'd@example.com', password: 'SaiMatKhau1' } });
  const unknownEmail = await ctx.request('POST', '/auth/login', { body: { email: 'khongco@example.com', password: 'SaiMatKhau1' } });
  assertError(wrongPassword, 401, 'UNAUTHORIZED', 'sai mật khẩu');
  assertError(unknownEmail, 401, 'UNAUTHORIZED', 'email không tồn tại');
  assert.equal(wrongPassword.body.error.message, unknownEmail.body.error.message, 'hai trường hợp phải cùng message');
});

test('Admin được seed từ ADMIN_EMAIL/ADMIN_PASSWORD', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const me = await ctx.request('GET', '/auth/me', { token: ctx.adminToken });
  assert.equal(me.status, 200, me.text);
  assert.equal(me.body.data.email, TEST_ENV.ADMIN_EMAIL);
  assert.equal(me.body.data.role, 'admin');
  assertNoSecrets(me, TEST_ENV.ADMIN_PASSWORD);
});

test('GET /auth/me từ chối mọi token không hợp lệ', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const { user } = await registerAndLogin(ctx, 'e@example.com');
  const now = Math.floor(Date.now() / 1000);
  const valid = { sub: user.id, role: 'customer', exp: now + 600 };
  const [head, , sig] = signJwt(valid).split('.');

  const cases = [
    [undefined, 'không có token'],
    ['abc.def', 'token rác'],
    [signJwt({ ...valid, exp: now - 60 }), 'token hết hạn'],
    [signJwt(valid, 'sai-secret'), 'ký bằng secret khác'],
    [`${head}.${b64url({ ...valid, role: 'admin' })}.${sig}`, 'sửa payload giữ chữ ký cũ'],
    [signJwt(valid, TEST_ENV.JWT_SECRET, { alg: 'none', typ: 'JWT' }).split('.').slice(0, 2).join('.') + '.', 'alg none'],
  ];
  for (const [token, why] of cases) {
    assertError(await ctx.request('GET', '/auth/me', { token }), 401, 'UNAUTHORIZED', why);
  }
  const ok = await ctx.request('GET', '/auth/me', { token: signJwt(valid) });
  assert.equal(ok.status, 200, 'token hợp lệ do chính JWT_SECRET ký phải được chấp nhận');
});

test('Ghi sản phẩm và điều chỉnh kho: chưa đăng nhập 401, khách 403, admin được', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const product = await createProduct(ctx);
  const attempts = [
    ['POST', '/products', { sku: 'NEW-1', name: 'Mới', price: 1000 }],
    ['PATCH', `/products/${product.id}`, { price: 1 }],
    ['DELETE', `/products/${product.id}`, undefined],
    ['POST', '/inventory/adjustments', { productId: product.id, quantity: 5, reason: 'x' }],
  ];
  for (const [method, path, body] of attempts) {
    assertError(await ctx.request(method, path, { body }), 401, 'UNAUTHORIZED', `${method} ${path} không token`);
    assertError(await ctx.request(method, path, { body, token: ctx.customerToken }), 403, 'FORBIDDEN', `${method} ${path} bằng khách`);
  }
  const publicList = await ctx.request('GET', '/products');
  assert.equal(publicList.status, 200, 'xem sản phẩm không cần đăng nhập');
  const publicOne = await ctx.request('GET', `/products/${product.id}`);
  assert.equal(publicOne.status, 200);
});

test('Đặt hàng cần đăng nhập, đơn gắn với khách đã đặt', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const product = await createProduct(ctx, { stock: 5 });
  const items = [{ productId: product.id, quantity: 1 }];
  assertError(await ctx.request('POST', '/orders', { body: { items } }), 401, 'UNAUTHORIZED', 'không token');

  const { token, user } = await registerAndLogin(ctx, 'f@example.com');
  const res = await ctx.request('POST', '/orders', { body: { items }, token });
  assert.equal(res.status, 201, res.text);
  assert.equal(String(res.body.data.customerId), String(user.id), 'customerId lấy từ token, không lấy từ body');
});

test('Khách chỉ thấy đơn của mình, admin thấy tất cả', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const product = await createProduct(ctx, { stock: 10 });
  const items = [{ productId: product.id, quantity: 1 }];
  const an = await registerAndLogin(ctx, 'an@example.com');
  const binh = await registerAndLogin(ctx, 'binh@example.com');
  const orderAn = (await ctx.request('POST', '/orders', { body: { items }, token: an.token })).body.data;
  const orderBinh = (await ctx.request('POST', '/orders', { body: { items }, token: binh.token })).body.data;

  assert.equal((await ctx.request('GET', `/orders/${orderAn.id}`, { token: an.token })).status, 200, 'chủ đơn xem được');
  assertError(await ctx.request('GET', `/orders/${orderBinh.id}`, { token: an.token }), 404, 'NOT_FOUND', 'đơn người khác trả 404 để không lộ đơn có tồn tại');
  assertError(await ctx.request('GET', `/orders/${orderAn.id}`), 401, 'UNAUTHORIZED', 'xem đơn cần đăng nhập');

  const listAn = await ctx.request('GET', '/orders', { token: an.token });
  assert.deepEqual(listAn.body.data.map((o) => o.id), [orderAn.id], 'khách chỉ thấy đơn của mình');
  assert.equal(listAn.body.meta.total, 1);
  const listAdmin = await ctx.request('GET', '/orders', { token: ctx.adminToken });
  assert.equal(listAdmin.body.meta.total, 2, 'admin thấy mọi đơn');
});

test('Thanh toán/giao hàng chỉ admin; khách chỉ huỷ đơn pending của mình', TEST_TIMEOUT, async (t) => {
  const ctx = await authApp(t);
  const product = await createProduct(ctx);
  await adjustStock(ctx, product.id, 10);
  const items = [{ productId: product.id, quantity: 1 }];
  const an = await registerAndLogin(ctx, 'an2@example.com');
  const binh = await registerAndLogin(ctx, 'binh2@example.com');
  const order = (await ctx.request('POST', '/orders', { body: { items }, token: an.token })).body.data;
  const post = (path, token) => ctx.request('POST', path, { token });

  assertError(await post(`/orders/${order.id}/pay`, an.token), 403, 'FORBIDDEN', 'khách tự đánh dấu đã thanh toán');
  assertError(await post(`/orders/${order.id}/cancel`, binh.token), 404, 'NOT_FOUND', 'huỷ đơn người khác');
  assert.equal((await post(`/orders/${order.id}/pay`, ctx.adminToken)).status, 200);
  assertError(await post(`/orders/${order.id}/cancel`, an.token), 403, 'FORBIDDEN', 'đơn đã thanh toán thì khách không tự huỷ');
  assertError(await post(`/orders/${order.id}/ship`, an.token), 403, 'FORBIDDEN');

  const second = (await ctx.request('POST', '/orders', { body: { items }, token: an.token })).body.data;
  const cancelled = await post(`/orders/${second.id}/cancel`, an.token);
  assert.equal(cancelled.status, 200, 'khách huỷ được đơn pending của mình');
});
