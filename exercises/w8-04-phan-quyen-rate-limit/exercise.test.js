import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, authorize, rateLimit } from './exercise.js';

// Response giả, có đủ API kiểu node:http mà middleware cần.
function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    ended: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = String(value);
    },
    end() {
      this.ended = true;
    },
  };
}

// Chạy middleware, trả về { res, nextCalled }.
function run(middleware, req) {
  assert.equal(typeof middleware, 'function', 'phải trả về một hàm middleware (req, res, next)');
  const res = fakeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

function assertBlocked({ res, nextCalled }, status, why) {
  assert.equal(nextCalled, false, `${why}: bị chặn thì không được gọi next()`);
  assert.equal(res.statusCode, status, why);
  assert.equal(res.ended, true, `${why}: phải gọi res.end()`);
}

const USERS = { 'token-admin': { id: 1, role: 'admin' }, 'token-khach': { id: 2, role: 'customer' } };
function verifyToken(token) {
  if (!USERS[token]) throw new Error('Token không hợp lệ');
  return USERS[token];
}

test('authenticate: token hợp lệ → gán req.user và gọi next()', () => {
  const req = { headers: { authorization: 'Bearer token-admin' } };
  const result = run(authenticate(verifyToken), req);
  assert.equal(result.nextCalled, true);
  assert.deepEqual(req.user, { id: 1, role: 'admin' });
  assert.equal(result.res.ended, false, 'cho đi tiếp thì không được end response');
});

test('authenticate: thiếu, sai định dạng hoặc token sai → 401', () => {
  const mw = authenticate(verifyToken);
  assertBlocked(run(mw, { headers: {} }), 401, 'thiếu header authorization');
  assertBlocked(run(mw, { headers: { authorization: 'token-admin' } }), 401, 'thiếu tiền tố Bearer');
  assertBlocked(run(mw, { headers: { authorization: 'Basic token-admin' } }), 401, 'sai kiểu xác thực');
  assertBlocked(run(mw, { headers: { authorization: 'Bearer token-gia' } }), 401, 'verifyToken throw');
});

test('authorize: đúng role → next(); sai role → 403; chưa đăng nhập → 401', () => {
  const mw = authorize('admin', 'staff');
  assert.equal(run(mw, { user: { id: 1, role: 'admin' } }).nextCalled, true);
  assert.equal(run(mw, { user: { id: 3, role: 'staff' } }).nextCalled, true);
  assertBlocked(run(mw, { user: { id: 2, role: 'customer' } }), 403, 'customer không có quyền');
  assertBlocked(run(mw, {}), 401, 'chưa có req.user là chưa xác thực, không phải thiếu quyền');
});

function clock(start) {
  const c = { t: start, now: () => c.t };
  return c;
}

test('rateLimit: cho qua tối đa max request trong một cửa sổ, request thứ max+1 → 429', () => {
  const c = clock(60_000);
  const mw = rateLimit({ windowMs: 60_000, max: 3, now: c.now });
  for (let i = 1; i <= 3; i += 1) {
    assert.equal(run(mw, { ip: '1.1.1.1' }).nextCalled, true, `request thứ ${i} phải qua`);
  }
  assertBlocked(run(mw, { ip: '1.1.1.1' }), 429, 'request thứ 4 vượt giới hạn');
});

test('rateLimit: Retry-After là số giây còn lại tới cửa sổ mới, làm tròn lên', () => {
  const c = clock(120_000);
  const mw = rateLimit({ windowMs: 60_000, max: 1, now: c.now });
  run(mw, { ip: '2.2.2.2' });
  c.t = 120_000 + 15_500; // còn 44.5 giây
  const result = run(mw, { ip: '2.2.2.2' });
  assertBlocked(result, 429, 'vượt giới hạn');
  assert.equal(result.res.headers['retry-after'], '45');
});

test('rateLimit: sang cửa sổ mới thì đếm lại', () => {
  const c = clock(0);
  const mw = rateLimit({ windowMs: 1000, max: 2, now: c.now });
  run(mw, { ip: 'a' });
  run(mw, { ip: 'a' });
  assertBlocked(run(mw, { ip: 'a' }), 429, 'hết lượt trong cửa sổ đầu');
  c.t = 1000;
  assert.equal(run(mw, { ip: 'a' }).nextCalled, true, 'cửa sổ mới bắt đầu tại 1000ms');
});

test('rateLimit: mỗi key đếm riêng, keyOf tùy chỉnh được', () => {
  const c = clock(0);
  const mw = rateLimit({ windowMs: 1000, max: 1, now: c.now });
  assert.equal(run(mw, { ip: 'x' }).nextCalled, true);
  assert.equal(run(mw, { ip: 'y' }).nextCalled, true, 'IP khác có lượt riêng');
  assertBlocked(run(mw, { ip: 'x' }), 429, 'IP x đã hết lượt');

  const byUser = rateLimit({ windowMs: 1000, max: 1, now: c.now, keyOf: (req) => req.user.id });
  assert.equal(run(byUser, { ip: 'z', user: { id: 7 } }).nextCalled, true);
  assertBlocked(run(byUser, { ip: 'khac', user: { id: 7 } }), 429, 'cùng user dù đổi IP vẫn bị đếm chung');
});

test('rateLimit: hai middleware tạo riêng không dùng chung bộ đếm', () => {
  const c = clock(0);
  const a = rateLimit({ windowMs: 1000, max: 1, now: c.now });
  const b = rateLimit({ windowMs: 1000, max: 1, now: c.now });
  assert.equal(run(a, { ip: 'q' }).nextCalled, true);
  assert.equal(run(b, { ip: 'q' }).nextCalled, true, 'bộ đếm phải nằm trong closure của từng middleware');
});
