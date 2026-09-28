import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { hashPassword, verifyPassword } from './exercise.js';

test('hashPassword: đúng định dạng scrypt$<salt hex 32 ký tự>$<hash hex 128 ký tự>', () => {
  const stored = hashPassword('matkhau123');
  assert.equal(typeof stored, 'string', 'phải trả về chuỗi');
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/, 'salt 16 byte = 32 hex, hash 64 byte = 128 hex');
});

test('hashPassword: hash thật sự là scrypt(plain, salt, 64)', () => {
  const stored = hashPassword('matkhau123');
  const [, saltHex, hashHex] = stored.split('$');
  const expected = scryptSync('matkhau123', Buffer.from(saltHex, 'hex'), 64).toString('hex');
  assert.equal(hashHex, expected, 'dùng salt dạng Buffer (không phải chuỗi hex) và keylen 64');
});

test('hashPassword: cùng mật khẩu, hai lần hash ra khác nhau (salt ngẫu nhiên)', () => {
  const a = hashPassword('matkhau123');
  const b = hashPassword('matkhau123');
  assert.equal(typeof a, 'string');
  assert.notEqual(a, b, 'salt phải sinh ngẫu nhiên mỗi lần');
});

test('hashPassword: mật khẩu rỗng hoặc không phải chuỗi thì throw TypeError', () => {
  assert.throws(() => hashPassword(''), TypeError);
  assert.throws(() => hashPassword(undefined), TypeError);
  assert.throws(() => hashPassword(123456), TypeError);
});

test('verifyPassword: đúng mật khẩu trả true, sai trả false', () => {
  const stored = hashPassword('matkhau123');
  assert.equal(verifyPassword('matkhau123', stored), true);
  assert.equal(verifyPassword('matkhau124', stored), false);
  assert.equal(verifyPassword('', stored), false);
});

test('verifyPassword: kiểm tra được hash tạo sẵn (không phụ thuộc hashPassword)', () => {
  const salt = Buffer.alloc(16, 7);
  const stored = `scrypt$${salt.toString('hex')}$${scryptSync('abc@123', salt, 64).toString('hex')}`;
  assert.equal(verifyPassword('abc@123', stored), true);
  assert.equal(verifyPassword('abc@124', stored), false);
});

test('verifyPassword: dữ liệu stored hỏng thì trả false, không throw', () => {
  const good = `scrypt$${'00'.repeat(16)}$${scryptSync('x', Buffer.alloc(16), 64).toString('hex')}`;
  const broken = [
    undefined,
    null,
    '',
    'khong-dung-dinh-dang',
    good.replace('scrypt$', 'md5$'),
    `scrypt$${'00'.repeat(16)}`,
    `scrypt$${'00'.repeat(16)}$abcd`,
    `scrypt$zz$${'00'.repeat(64)}`,
    `${good}$thua`,
  ];
  for (const stored of broken) {
    let result;
    assert.doesNotThrow(() => {
      result = verifyPassword('x', stored);
    }, `không được throw với stored = ${JSON.stringify(stored)}`);
    assert.equal(result, false, `stored = ${JSON.stringify(stored)} phải trả false`);
  }
  assert.equal(verifyPassword('x', good), true, 'đối chứng: stored đúng thì trả true');
});
