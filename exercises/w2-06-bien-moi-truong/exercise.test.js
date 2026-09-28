import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from './exercise.js';

const DB = 'postgres://localhost/shop';

test('đủ biến môi trường: chuyển đúng kiểu', () => {
  const config = getConfig({ PORT: '8080', DATABASE_URL: DB, NODE_ENV: 'production', DEBUG: 'true' });
  assert.deepEqual({ ...config }, { port: 8080, databaseUrl: DB, nodeEnv: 'production', debug: true });
  assert.equal(typeof config.port, 'number', 'PORT trong env là chuỗi, phải đổi sang số');
});

test('giá trị mặc định khi thiếu PORT, NODE_ENV, DEBUG', () => {
  const config = getConfig({ DATABASE_URL: DB });
  assert.deepEqual({ ...config }, { port: 3000, databaseUrl: DB, nodeEnv: 'development', debug: false });
});

test('PORT không hợp lệ thì throw', () => {
  for (const port of ['abc', '30.5', '0', '-1', '8080abc', '70000']) {
    assert.throws(() => getConfig({ PORT: port, DATABASE_URL: DB }), Error, `PORT = '${port}' phải bị từ chối`);
  }
});

test('thiếu DATABASE_URL thì throw, message nêu tên biến', () => {
  assert.throws(() => getConfig({}), /DATABASE_URL/);
  assert.throws(() => getConfig({ DATABASE_URL: '' }), /DATABASE_URL/, 'chuỗi rỗng cũng coi như thiếu');
});

test('DEBUG: chỉ "true" và "1" là bật', () => {
  const debugOf = (value) => getConfig({ DATABASE_URL: DB, DEBUG: value }).debug;
  assert.equal(debugOf('true'), true);
  assert.equal(debugOf('1'), true);
  assert.equal(debugOf('false'), false, "chuỗi 'false' là truthy, không được coi là bật");
  assert.equal(debugOf('0'), false);
  assert.equal(debugOf(''), false);
});

test('object cấu hình bị đóng băng', () => {
  const config = getConfig({ DATABASE_URL: DB });
  assert.equal(typeof config, 'object', 'getConfig phải return một object');
  assert.ok(Object.isFrozen(config), 'dùng Object.freeze trước khi return');
});

test('không sửa object env truyền vào', () => {
  const env = { DATABASE_URL: DB };
  const config = getConfig(env);
  assert.equal(config?.port, 3000, 'vẫn phải trả về config với PORT mặc định');
  assert.deepEqual(env, { DATABASE_URL: DB });
});
