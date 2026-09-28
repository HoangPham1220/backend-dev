import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getJson, HttpError } from './lib/http.js';
import { fetchAllOrderIds } from './lib/paginate.js';
import { mapWithLimit } from './lib/pool.js';
import { writeJsonLines } from './lib/writer.js';
import { syncOrders } from './exercise.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Server giả kiểu Shopify, chạy trên máy (port ngẫu nhiên).
//   GET /orders?page=N  -> 3 trang: [1,2,3] [4,5,6] [7,8]
//   GET /orders/:id     -> chi tiết đơn (chậm 30ms), lỗi theo `scenario`
//   GET /test/...       -> các endpoint để test riêng getJson
// ---------------------------------------------------------------------------
const PAGES = {
  1: { orders: [{ id: 1 }, { id: 2 }, { id: 3 }], nextPage: 2 },
  2: { orders: [{ id: 4 }, { id: 5 }, { id: 6 }], nextPage: 3 },
  3: { orders: [{ id: 7 }, { id: 8 }], nextPage: null },
};
const ALL_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const orderDetail = (id) => ({
  id,
  total: id * 10000,
  items: [{ sku: `SKU-${id}`, price: id * 10000, quantity: 1 }],
});

let server;
let baseUrl;
let dir;
// scenario[id]: mảng status trả lần lượt trước khi thành công (vd [429, 500]),
// hoặc 'notFound' (luôn 404), hoặc 'always500'.
let scenario;
let hits; // đếm số request theo đường dẫn
let requestLog;
let inFlight;
let maxInFlight;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  hits[path + url.search] = (hits[path + url.search] ?? 0) + 1;
  const hit = hits[path + url.search];
  requestLog.push(path + url.search);

  if (path === '/test/ok') return send(res, 200, { ok: true, sku: 'CAP' });
  if (path === '/test/404') return send(res, 404, { error: 'Not Found' });
  if (path === '/test/429-then-ok') {
    return hit === 1 ? send(res, 429, { error: 'Too Many Requests' }, { 'Retry-After': '0.05' }) : send(res, 200, { ok: true });
  }
  if (path === '/test/429-no-header') {
    return hit === 1 ? send(res, 429, { error: 'Too Many Requests' }) : send(res, 200, { ok: true });
  }
  if (path === '/test/500x2') return hit <= 2 ? send(res, 500, { error: 'Oops' }) : send(res, 200, { ok: true });
  if (path === '/test/always500') return send(res, 500, { error: 'Oops' });

  if (path === '/orders') {
    const page = PAGES[url.searchParams.get('page')];
    return page ? send(res, 200, page) : send(res, 400, { error: 'Bad page' });
  }

  const match = path.match(/^\/orders\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await delay(30);
    inFlight -= 1;
    const rule = scenario[id];
    if (rule === 'notFound') return send(res, 404, { error: 'Not Found' });
    if (rule === 'always500') return send(res, 500, { error: 'Oops' });
    if (Array.isArray(rule) && hit <= rule.length) {
      const status = rule[hit - 1];
      return send(res, status, { error: 'tạm thời lỗi' }, status === 429 ? { 'Retry-After': '0.05' } : {});
    }
    return send(res, 200, orderDetail(id));
  }
  return send(res, 404, { error: 'Not Found' });
}

before(async () => {
  server = createServer((req, res) => {
    handle(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  dir = mkdtempSync(join(tmpdir(), 'w3-50-'));
});

after(() => {
  server.closeAllConnections();
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  scenario = {};
  hits = {};
  requestLog = [];
  inFlight = 0;
  maxInFlight = 0;
});

const readLines = (filePath) =>
  readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line));

// --- Bước 1: getJson -------------------------------------------------------

test('B1 getJson: 200 trả JSON đã parse', { timeout: 5000 }, async () => {
  assert.deepEqual(await getJson(`${baseUrl}/test/ok`), { ok: true, sku: 'CAP' });
});

test('B1 getJson: 404 throw HttpError ngay, không thử lại', { timeout: 5000 }, async () => {
  await assert.rejects(() => getJson(`${baseUrl}/test/404`), (error) => {
    assert.ok(error instanceof HttpError, 'phải throw HttpError');
    assert.equal(error.status, 404);
    return true;
  });
  assert.equal(hits['/test/404'], 1, 'lỗi 404 thử lại cũng vô ích, chỉ được gọi 1 lần');
});

test('B1 getJson: 429 chờ đúng Retry-After (giây) rồi thử lại', { timeout: 5000 }, async () => {
  const start = performance.now();
  assert.deepEqual(await getJson(`${baseUrl}/test/429-then-ok`), { ok: true });
  const elapsed = performance.now() - start;
  assert.equal(hits['/test/429-then-ok'], 2);
  assert.ok(elapsed >= 40, `Retry-After: 0.05 là 50ms, bạn chỉ chờ ${Math.round(elapsed)}ms`);
  assert.ok(elapsed < 1000, `chờ ${Math.round(elapsed)}ms: Retry-After tính bằng giây, nhớ đổi sang ms`);
});

test('B1 getJson: 429 không có Retry-After thì chờ baseDelayMs', { timeout: 5000 }, async () => {
  const start = performance.now();
  assert.deepEqual(await getJson(`${baseUrl}/test/429-no-header`, { baseDelayMs: 80 }), { ok: true });
  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 70, `phải chờ baseDelayMs (80ms), bạn chỉ chờ ${Math.round(elapsed)}ms`);
});

test('B1 getJson: 500 hai lần rồi thành công, chờ theo exponential backoff', { timeout: 5000 }, async () => {
  const start = performance.now();
  assert.deepEqual(await getJson(`${baseUrl}/test/500x2`, { baseDelayMs: 40 }), { ok: true });
  const elapsed = performance.now() - start;
  assert.equal(hits['/test/500x2'], 3);
  assert.ok(elapsed >= 110, `backoff 40ms + 80ms = 120ms, bạn chỉ chờ ${Math.round(elapsed)}ms`);
});

test('B1 getJson: luôn 500 thì gọi 1 + maxRetries lần rồi throw HttpError 500', { timeout: 5000 }, async () => {
  await assert.rejects(() => getJson(`${baseUrl}/test/always500`, { maxRetries: 2, baseDelayMs: 5 }), (error) => {
    assert.ok(error instanceof HttpError, 'phải throw HttpError');
    assert.equal(error.status, 500);
    return true;
  });
  assert.equal(hits['/test/always500'], 3);
});

// --- Bước 2: fetchAllOrderIds ---------------------------------------------

test('B2 fetchAllOrderIds: đi hết các trang theo nextPage, giữ thứ tự id', { timeout: 5000 }, async () => {
  assert.deepEqual(await fetchAllOrderIds(baseUrl, getJson), ALL_IDS);
  assert.deepEqual(requestLog, ['/orders?page=1', '/orders?page=2', '/orders?page=3']);
});

// --- Bước 3: mapWithLimit --------------------------------------------------

test('B3 mapWithLimit: tối đa limit việc cùng lúc, kết quả đúng thứ tự', { timeout: 5000 }, async () => {
  let running = 0;
  let maxRunning = 0;
  const results = await mapWithLimit([50, 10, 30, 20, 40], 2, async (ms) => {
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    await delay(ms);
    running -= 1;
    return ms * 2;
  });
  assert.deepEqual(results, [100, 20, 60, 40, 80]);
  assert.equal(maxRunning, 2, 'phải chạy đúng tối đa 2 việc cùng lúc');
});

// --- Bước 4: writeJsonLines ------------------------------------------------

test('B4 writeJsonLines: mỗi record một dòng, kết thúc bằng \\n; mảng rỗng là file rỗng', { timeout: 5000 }, async () => {
  const filePath = join(dir, 'lines.jsonl');
  await writeJsonLines(filePath, [{ id: 1, total: 100 }, { id: 2, total: 200 }]);
  assert.equal(readFileSync(filePath, 'utf8'), '{"id":1,"total":100}\n{"id":2,"total":200}\n');
  const emptyPath = join(dir, 'empty.jsonl');
  await writeJsonLines(emptyPath, []);
  assert.equal(readFileSync(emptyPath, 'utf8'), '');
});

// --- Bước 5: syncOrders ----------------------------------------------------

test('B5 syncOrders: đồng bộ đủ 8 đơn, ghi file đúng thứ tự id', { timeout: 5000 }, async () => {
  const outFile = join(dir, 'happy.jsonl');
  assert.deepEqual(await syncOrders({ baseUrl, outFile }), { synced: 8, failed: [] });
  assert.ok(existsSync(outFile), 'phải ghi ra outFile');
  assert.deepEqual(readLines(outFile), ALL_IDS.map(orderDetail));
});

test('B5 syncOrders: tôn trọng concurrency (2)', { timeout: 5000 }, async () => {
  await syncOrders({ baseUrl, outFile: join(dir, 'c2.jsonl'), concurrency: 2 });
  assert.equal(maxInFlight, 2, `có lúc ${maxInFlight} request chi tiết chạy cùng lúc, phải đúng 2`);
});

test('B5 syncOrders: concurrency mặc định là 3', { timeout: 5000 }, async () => {
  await syncOrders({ baseUrl, outFile: join(dir, 'c3.jsonl') });
  assert.equal(maxInFlight, 3, `có lúc ${maxInFlight} request chi tiết chạy cùng lúc, mặc định phải là 3`);
});

test('B5 syncOrders: 429 và 500 thoáng qua thì retry, vẫn đủ 8 đơn', { timeout: 5000 }, async () => {
  scenario = { 2: [429], 4: [500, 503], 7: [429, 500] };
  const outFile = join(dir, 'transient.jsonl');
  assert.deepEqual(await syncOrders({ baseUrl, outFile }), { synced: 8, failed: [] });
  assert.equal(hits['/orders/4'], 3, 'đơn 4 lỗi 2 lần nên phải gọi 3 lần');
  assert.deepEqual(readLines(outFile).map((order) => order.id), ALL_IDS);
});

test('B5 syncOrders: 404 và lỗi quá maxRetries vào failed, không làm hỏng cả job', { timeout: 5000 }, async () => {
  scenario = { 5: 'notFound', 6: 'always500' };
  const outFile = join(dir, 'partial.jsonl');
  const report = await syncOrders({ baseUrl, outFile, maxRetries: 1 });
  assert.equal(report.synced, 6);
  assert.deepEqual(report.failed.map((f) => f.id), [5, 6], 'failed gồm đơn 5 và 6, theo thứ tự id');
  assert.match(report.failed[0].reason, /404/, 'reason là error.message, có status');
  assert.match(report.failed[1].reason, /500/);
  assert.equal(hits['/orders/5'], 1, '404 không được thử lại');
  assert.equal(hits['/orders/6'], 2, 'maxRetries: 1 nghĩa là tổng 2 lần gọi');
  assert.deepEqual(readLines(outFile).map((order) => order.id), [1, 2, 3, 4, 7, 8]);
});
