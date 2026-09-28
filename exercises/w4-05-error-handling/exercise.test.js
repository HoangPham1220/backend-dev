import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { HttpError, NotFoundError, ValidationError, errorHandler } from './exercise.js';

test('HttpError: kế thừa Error, có status, code, details, name', () => {
  const err = new HttpError(409, 'SKU đã tồn tại', { sku: 'CAP' });
  assert.ok(err instanceof Error, 'phải extends Error');
  assert.equal(err.status, 409);
  assert.equal(err.message, 'SKU đã tồn tại');
  assert.deepEqual(err.details, { sku: 'CAP' });
  assert.equal(err.code, 'CONFLICT', 'code lấy từ ERROR_CODES[status]');
  assert.equal(err.name, 'HttpError');
  assert.ok(err.stack, 'kế thừa Error thì có stack');

  const other = new HttpError(418, 'Tôi là ấm trà');
  assert.equal(other.code, 'HTTP_ERROR', 'status không có trong ERROR_CODES thì code là HTTP_ERROR');
  assert.equal(other.details, null, 'details mặc định là null');
});

test('NotFoundError: status 404, message mặc định', () => {
  const err = new NotFoundError();
  assert.ok(err instanceof HttpError, 'phải extends HttpError');
  assert.ok(err instanceof Error);
  assert.equal(err.status, 404);
  assert.equal(err.code, 'NOT_FOUND');
  assert.equal(err.message, 'Không tìm thấy');
  assert.equal(err.name, 'NotFoundError');
  assert.equal(new NotFoundError('Không có đơn #9').message, 'Không có đơn #9');
});

test('ValidationError: status 422, giữ details từng field', () => {
  const details = { price: 'phải là số nguyên dương', name: 'bắt buộc' };
  const err = new ValidationError(details);
  assert.ok(err instanceof HttpError);
  assert.equal(err.status, 422);
  assert.equal(err.code, 'VALIDATION_ERROR');
  assert.equal(err.message, 'Dữ liệu không hợp lệ');
  assert.equal(err.name, 'ValidationError');
  assert.deepEqual(err.details, details);
});

// Server thử: path quyết định lỗi nào được throw, rồi đưa vào errorHandler.
async function requestWithError(makeError) {
  const server = http.createServer((req, res) => {
    try {
      throw makeError();
    } catch (err) {
      try {
        errorHandler(err, req, res);
      } catch {
        // errorHandler tự nó lỗi: trả mã đặc biệt để test báo rõ.
      }
      if (!res.writableEnded) {
        res.writeHead(599);
        res.end('errorHandler không gửi response');
      }
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`, { signal: AbortSignal.timeout(2000) });
    const text = await res.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {}
    return { status: res.status, contentType: res.headers.get('content-type') ?? '', body, text };
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

test('errorHandler: NotFoundError → 404 JSON đúng dạng', { timeout: 5000 }, async () => {
  const res = await requestWithError(() => new NotFoundError('Không tìm thấy sản phẩm CAP'));
  assert.equal(res.status, 404);
  assert.match(res.contentType, /^application\/json/);
  assert.deepEqual(res.body, {
    error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm CAP', details: null },
  });
});

test('errorHandler: ValidationError → 422 kèm details', { timeout: 5000 }, async () => {
  const res = await requestWithError(() => new ValidationError({ price: 'phải là số' }));
  assert.equal(res.status, 422);
  assert.deepEqual(res.body, {
    error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: { price: 'phải là số' } },
  });
});

test('errorHandler: lỗi thường có status 4xx (như lỗi của readJsonBody)', { timeout: 5000 }, async () => {
  const res = await requestWithError(() => Object.assign(new Error('Invalid JSON'), { status: 400 }));
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: { code: 'BAD_REQUEST', message: 'Invalid JSON', details: null } });
});

test('errorHandler: lỗi không lường trước → 500, không lộ chi tiết, có ghi log', { timeout: 5000 }, async (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const secret = new Error('connect ECONNREFUSED db.internal:5432 user=admin password=hunter2');
  const res = await requestWithError(() => secret);
  assert.equal(res.status, 500);
  assert.deepEqual(res.body, {
    error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', details: null },
  });
  assert.ok(!res.text.includes('hunter2') && !res.text.includes('db.internal'), 'không được lộ message lỗi gốc');
  assert.ok(!res.text.includes('at '), 'không được lộ stack trace');
  assert.ok(
    logged.mock.calls.some((call) => call.arguments.includes(secret)),
    'phải console.error(err) lỗi gốc để dev còn debug được',
  );
});

test('errorHandler: lỗi có status 5xx hoặc throw giá trị lạ vẫn là 500 chung chung', { timeout: 5000 }, async (t) => {
  t.mock.method(console, 'error', () => {});
  const withStatus = await requestWithError(() => Object.assign(new Error('pool exhausted'), { status: 503 }));
  assert.equal(withStatus.status, 500, 'chỉ tin err.status khi là lỗi 4xx');
  assert.equal(withStatus.body?.error?.message, 'Internal Server Error');

  const weird = await requestWithError(() => 'chuỗi, không phải Error');
  assert.equal(weird.status, 500, 'throw một chuỗi cũng không được làm errorHandler crash');
  assert.equal(weird.body?.error?.code, 'INTERNAL_ERROR');
});
