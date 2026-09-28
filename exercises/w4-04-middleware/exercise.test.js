import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { compose, requestId, logger } from './exercise.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(middlewares, req = {}, res = {}) {
  const app = compose(middlewares);
  assert.equal(typeof app, 'function', 'compose(...) phải trả về một hàm (req, res) => Promise');
  const result = app(req, res);
  assert.ok(result instanceof Promise, 'hàm do compose trả về phải trả về Promise');
  return result;
}

test('Chạy middleware theo thứ tự, cùng req và res', { timeout: 5000 }, async () => {
  const log = [];
  const req = {};
  const res = {};
  await run(
    [
      (rq, rs, next) => { log.push(['a', rq === req, rs === res]); next(); },
      (rq, rs, next) => { log.push(['b', rq === req, rs === res]); next(); },
      (rq, rs) => { log.push(['c', rq === req, rs === res]); },
    ],
    req,
    res,
  );
  assert.deepEqual(log, [['a', true, true], ['b', true, true], ['c', true, true]]);
});

test('Không gọi next() thì chuỗi dừng', { timeout: 5000 }, async () => {
  const log = [];
  await run([
    (req, res, next) => { log.push('a'); next(); },
    () => { log.push('b'); },
    () => { log.push('c'); },
  ]);
  assert.deepEqual(log, ['a', 'b'], 'middleware "b" không gọi next() nên "c" không được chạy');
});

test('Middleware async: await next() chờ phần sau chạy xong', { timeout: 5000 }, async () => {
  const log = [];
  await run([
    async (req, res, next) => { log.push('a:trước'); await next(); log.push('a:sau'); },
    async (req, res, next) => { await delay(20); log.push('b'); await next(); },
    () => { log.push('c'); },
  ]);
  assert.deepEqual(log, ['a:trước', 'b', 'c', 'a:sau'], 'Promise của compose resolve khi cả chuỗi xong');
});

test('next(err) nhảy thẳng tới middleware xử lý lỗi (4 tham số)', { timeout: 5000 }, async () => {
  const log = [];
  const boom = new Error('hết hàng');
  const req = {};
  await run(
    [
      (rq, res, next) => { log.push('a'); next(boom); },
      () => { log.push('không được chạy'); },
      (err, rq, res, next) => { log.push(['xử lý lỗi', err, rq === req]); },
    ],
    req,
  );
  assert.deepEqual(log, ['a', ['xử lý lỗi', boom, true]]);
});

test('Middleware thường bị bỏ qua khi không có lỗi, error handler bị bỏ qua khi không có lỗi', { timeout: 5000 }, async () => {
  const log = [];
  await run([
    (req, res, next) => { log.push('a'); next(); },
    (err, req, res, next) => { log.push('error handler không được chạy khi không có lỗi'); next(); },
    () => { log.push('b'); },
  ]);
  assert.deepEqual(log, ['a', 'b']);
});

test('throw trong middleware thường cũng chuyển sang xử lý lỗi', { timeout: 5000 }, async () => {
  let caught;
  await run([
    () => { throw new Error('sync lỗi'); },
    (err, req, res, next) => { caught = err; },
  ]);
  assert.equal(caught?.message, 'sync lỗi');
});

test('Middleware async bị reject cũng chuyển sang xử lý lỗi', { timeout: 5000 }, async () => {
  let caught;
  await run([
    async () => { await delay(10); throw new Error('async lỗi'); },
    () => assert.fail('không được chạy middleware thường sau lỗi'),
    (err, req, res, next) => { caught = err; },
  ]);
  assert.equal(caught?.message, 'async lỗi', 'phải bắt được Promise bị reject (await + try/catch)');
});

test('Error handler gọi next(err) chuyển lỗi tới error handler kế tiếp', { timeout: 5000 }, async () => {
  const log = [];
  await run([
    (req, res, next) => next(new Error('x')),
    (err, req, res, next) => { log.push('handler 1'); next(err); },
    (req, res, next) => { log.push('middleware thường: bỏ qua'); next(); },
    (err, req, res, next) => { log.push(`handler 2: ${err.message}`); },
  ]);
  assert.deepEqual(log, ['handler 1', 'handler 2: x']);
});

test('Lỗi không ai xử lý thì Promise của compose bị reject', { timeout: 5000 }, async () => {
  const boom = new Error('không ai bắt');
  await assert.rejects(
    run([(req, res, next) => next(boom), () => {}]),
    (err) => err === boom,
    'không có error handler thì phải reject với chính lỗi đó',
  );
});

async function withServer(middlewares, fn) {
  for (const mw of middlewares) {
    assert.equal(typeof mw, 'function', 'requestId() và logger() phải trả về một hàm middleware');
  }
  const app = compose(middlewares);
  assert.equal(typeof app, 'function', 'compose(...) phải trả về một hàm');
  const server = http.createServer(async (req, res) => {
    try {
      await app(req, res);
    } catch {
      res.statusCode = 500;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

test('requestId(): tạo id mới mỗi request, gắn vào req.id và header', { timeout: 5000 }, async () => {
  const ids = [];
  await withServer(
    [requestId(), (req, res) => { ids.push(req.id); res.end('ok'); }],
    async (base) => {
      const r1 = await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
      const r2 = await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
      const h1 = r1.headers.get('x-request-id');
      const h2 = r2.headers.get('x-request-id');
      assert.match(h1 ?? '', /^[0-9a-f-]{36}$/, 'header x-request-id phải là UUID (crypto.randomUUID)');
      assert.notEqual(h1, h2, 'mỗi request một id khác nhau');
      assert.deepEqual(ids, [h1, h2], 'req.id phải trùng header gửi về');
    },
  );
});

test('requestId(): dùng lại x-request-id client gửi lên', { timeout: 5000 }, async () => {
  await withServer([requestId(), (req, res) => res.end(req.id)], async (base) => {
    const res = await fetch(`${base}/`, { headers: { 'x-request-id': 'from-client-123' }, signal: AbortSignal.timeout(2000) });
    assert.equal(res.headers.get('x-request-id'), 'from-client-123');
    assert.equal(await res.text(), 'from-client-123');
  });
});

test('logger(): ghi method, url, status, thời gian sau khi response xong', { timeout: 5000 }, async () => {
  const lines = [];
  await withServer(
    [
      logger((line) => lines.push(line)),
      async (req, res) => {
        await delay(30);
        res.statusCode = req.url === '/products' ? 200 : 404;
        res.end();
      },
    ],
    async (base) => {
      await fetch(`${base}/products`, { signal: AbortSignal.timeout(2000) });
      await fetch(`${base}/nope?x=1`, { signal: AbortSignal.timeout(2000) });
      await delay(20);
    },
  );
  assert.equal(lines.length, 2, 'mỗi request đúng một dòng log');
  assert.match(lines[0], /^GET \/products 200 \d+ms$/);
  assert.match(lines[1], /^GET \/nope\?x=1 404 \d+ms$/, 'status phải là status thật lúc gửi response (404)');
  const ms = Number(lines[0].match(/(\d+)ms$/)[1]);
  assert.ok(ms >= 25, `thời gian phải tính đến lúc response xong (được ${ms}ms, handler chờ 30ms)`);
});
