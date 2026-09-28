import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { sign, verify, JwtError } from './exercise.js';

const SECRET = 'bi-mat-cua-shop';
const NOW = 1_700_000_000;

// Tự dựng token trong test để đối chiếu, không phụ thuộc code người học.
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
function makeToken(header, payload, secret = SECRET) {
  const data = `${b64(header)}.${b64(payload)}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}
const HEADER = { alg: 'HS256', typ: 'JWT' };

function assertJwtError(fn, code, why) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof JwtError, `phải throw JwtError, nhận được ${error?.name}: ${error?.message}`);
    assert.equal(error.code, code, why);
    return true;
  });
}

test('sign: token khớp từng ký tự với token HS256 chuẩn', () => {
  const token = sign({ sub: 1, role: 'admin' }, SECRET, { now: NOW, expiresInSec: 60 });
  const expected = makeToken(HEADER, { sub: 1, role: 'admin', iat: NOW, exp: NOW + 60 });
  assert.equal(token, expected, 'kiểm tra thứ tự khóa header/payload và dùng base64url (không phải base64)');
});

test('sign: expiresInSec mặc định là 3600 giây', () => {
  const token = sign({ sub: 2 }, SECRET, { now: NOW });
  assert.equal(token, makeToken(HEADER, { sub: 2, iat: NOW, exp: NOW + 3600 }));
});

test('verify: token hợp lệ trả về payload', () => {
  const token = makeToken(HEADER, { sub: 1, role: 'admin', iat: NOW, exp: NOW + 60 });
  assert.deepEqual(verify(token, SECRET, { now: NOW + 10 }), { sub: 1, role: 'admin', iat: NOW, exp: NOW + 60 });
});

test('verify: token sai định dạng → MALFORMED', () => {
  assertJwtError(() => verify('abc', SECRET, { now: NOW }), 'MALFORMED', 'không đủ 3 phần');
  assertJwtError(() => verify('a.b.c.d', SECRET, { now: NOW }), 'MALFORMED', 'thừa phần');
  assertJwtError(() => verify('!!!.@@@.###', SECRET, { now: NOW }), 'MALFORMED', 'header không phải JSON');
  assertJwtError(() => verify(undefined, SECRET, { now: NOW }), 'MALFORMED', 'không phải chuỗi');
});

test('verify: payload bị sửa → BAD_SIGNATURE', () => {
  const token = makeToken(HEADER, { sub: 1, role: 'user', iat: NOW, exp: NOW + 60 });
  const [header, , signature] = token.split('.');
  const forged = `${header}.${b64({ sub: 1, role: 'admin', iat: NOW, exp: NOW + 60 })}.${signature}`;
  assertJwtError(() => verify(forged, SECRET, { now: NOW }), 'BAD_SIGNATURE', 'đổi role thì chữ ký phải không khớp');
});

test('verify: ký bằng secret khác → BAD_SIGNATURE', () => {
  const token = makeToken(HEADER, { sub: 1, iat: NOW, exp: NOW + 60 }, 'secret-khac');
  assertJwtError(() => verify(token, SECRET, { now: NOW }), 'BAD_SIGNATURE');
});

test('verify: alg "none" hoặc thuật toán khác → UNSUPPORTED_ALG (kiểm tra trước chữ ký)', () => {
  const noneToken = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 1, role: 'admin', iat: NOW, exp: NOW + 60 })}.`;
  assertJwtError(() => verify(noneToken, SECRET, { now: NOW }), 'UNSUPPORTED_ALG', 'tấn công alg none phải bị chặn');
  const hs512 = makeToken({ alg: 'HS512', typ: 'JWT' }, { sub: 1, iat: NOW, exp: NOW + 60 });
  assertJwtError(() => verify(hs512, SECRET, { now: NOW }), 'UNSUPPORTED_ALG');
});

test('verify: hết hạn → EXPIRED (đúng thời điểm exp cũng tính là hết hạn)', () => {
  const token = makeToken(HEADER, { sub: 1, iat: NOW, exp: NOW + 60 });
  assert.equal(verify(token, SECRET, { now: NOW + 59 }).sub, 1, 'còn 1 giây vẫn hợp lệ');
  assertJwtError(() => verify(token, SECRET, { now: NOW + 60 }), 'EXPIRED', 'now >= exp là hết hạn');
  assertJwtError(() => verify(token, SECRET, { now: NOW + 3600 }), 'EXPIRED');
});

test('sign rồi verify: đi một vòng trả lại đúng dữ liệu', () => {
  const token = sign({ sub: 42, email: 'a@shop.vn' }, SECRET, { now: NOW, expiresInSec: 10 });
  const payload = verify(token, SECRET, { now: NOW + 5 });
  assert.equal(payload?.sub, 42);
  assert.equal(payload?.email, 'a@shop.vn');
});
