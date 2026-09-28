import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { runWithContext, getContext, createLogger, contextMiddleware } from './exercise.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('ngoài ngữ cảnh là undefined; runWithContext trả kết quả của fn; lồng nhau đúng', () => {
  assert.equal(getContext(), undefined, 'ngoài mọi ngữ cảnh phải là undefined');
  const result = runWithContext({ requestId: 'outer' }, () => {
    assert.equal(getContext()?.requestId, 'outer');
    const inner = runWithContext({ requestId: 'inner' }, () => getContext()?.requestId);
    assert.equal(inner, 'inner');
    assert.equal(getContext()?.requestId, 'outer', 'ra khỏi ngữ cảnh con phải trở về ngữ cảnh cha');
    return 42;
  });
  assert.equal(result, 42);
  assert.equal(getContext(), undefined);
});

test('ngữ cảnh đi qua await, setTimeout, Promise.all', { timeout: 5000 }, async () => {
  const seen = await runWithContext({ requestId: 'r-async' }, async () => {
    const ids = [];
    await sleep(5);
    ids.push(getContext()?.requestId);
    await new Promise((resolve) =>
      setTimeout(() => {
        ids.push(getContext()?.requestId);
        resolve();
      }, 5),
    );
    const fromAll = await Promise.all([1, 2, 3].map(async (i) => {
      await sleep(i);
      return getContext()?.requestId;
    }));
    return [...ids, ...fromAll];
  });
  assert.deepEqual(seen, ['r-async', 'r-async', 'r-async', 'r-async', 'r-async']);
});

test('nhiều ngữ cảnh chạy xen kẽ không lẫn nhau', { timeout: 5000 }, async () => {
  const tasks = Array.from({ length: 50 }, (_, i) =>
    runWithContext({ requestId: `r-${i}` }, async () => {
      await sleep((i * 7) % 13);
      const first = getContext()?.requestId;
      await sleep((i * 3) % 5);
      return [first, getContext()?.requestId];
    }),
  );
  const results = await Promise.all(tasks);
  results.forEach(([a, b], i) => {
    assert.equal(a, `r-${i}`);
    assert.equal(b, `r-${i}`);
  });
});

test('logger: một dòng JSON có time, level, msg, requestId và fields', () => {
  const lines = [];
  const logger = createLogger((line) => lines.push(line), { now: () => '2026-10-01T00:00:00.000Z' });
  runWithContext({ requestId: 'r-1' }, () => logger.info('Tạo đơn', { orderId: 42 }));
  logger.warn('Ngoài request');
  assert.equal(lines.length, 2, 'mỗi lần log gọi write đúng một lần');
  assert.ok(lines.every((line) => line.endsWith('\n') && line.split('\n').length === 2), 'mỗi lần log là đúng một dòng');
  assert.deepEqual(JSON.parse(lines[0]), {
    time: '2026-10-01T00:00:00.000Z',
    level: 'info',
    msg: 'Tạo đơn',
    requestId: 'r-1',
    orderId: 42,
  });
  const outside = JSON.parse(lines[1]);
  assert.equal(outside.level, 'warn');
  assert.equal('requestId' in outside, false, 'ngoài ngữ cảnh thì không có key requestId');
});

test('logger: fields không ghi đè time/level/msg; Error được ghi thành name và message', () => {
  const lines = [];
  const logger = createLogger((line) => lines.push(line), { now: () => 'T' });
  logger.error('Thanh toán lỗi', { level: 'debug', msg: 'giả', time: 'x', err: new TypeError('thẻ hết hạn') });
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.level, 'error');
  assert.equal(entry.msg, 'Thanh toán lỗi');
  assert.equal(entry.time, 'T');
  assert.deepEqual(entry.err, { name: 'TypeError', message: 'thẻ hết hạn' }, 'JSON.stringify(Error) ra {} nên phải tự chuyển');
});

test('middleware với node:http: request đồng thời không lẫn requestId trong log', { timeout: 5000 }, async (t) => {
  const lines = [];
  const logger = createLogger((line) => lines.push(line));
  let counter = 0;
  const middleware = contextMiddleware({ generateId: () => `gen-${++counter}` });
  const server = http.createServer((req, res) => {
    middleware(req, res, async () => {
      const delay = Number(new URL(req.url, 'http://x').searchParams.get('delay'));
      logger.info('bắt đầu', { url: req.url });
      await sleep(delay);
      logger.info('xong', { url: req.url });
      res.end(getContext()?.requestId ?? 'không có ngữ cảnh');
    });
  });
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      fetch(`${base}/orders?i=${i}&delay=${(i * 7) % 30}`, { headers: { 'x-request-id': `req-${i}` } }),
    ),
  );
  for (const [i, res] of responses.entries()) {
    assert.equal(res.headers.get('x-request-id'), `req-${i}`, 'phải trả lại header x-request-id');
    assert.equal(await res.text(), `req-${i}`);
  }
  const entries = lines.map((line) => JSON.parse(line));
  assert.equal(entries.length, 40);
  for (const entry of entries) {
    const i = new URL(entry.url, 'http://x').searchParams.get('i');
    assert.equal(entry.requestId, `req-${i}`, `log của request ${i} bị gắn nhầm requestId`);
  }

  const generated = await fetch(`${base}/x?delay=0`);
  assert.equal(generated.headers.get('x-request-id'), 'gen-1', 'không có header thì dùng generateId()');
});
