import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { encodeCursor, decodeCursor, listProducts } from './exercise.js';

// 200 sản phẩm: price lặp lại theo nhóm 10 (nhiều dòng cùng giá), created_at lặp theo nhóm 5.
function createDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE products (
    id INTEGER PRIMARY KEY, sku TEXT NOT NULL, price INTEGER NOT NULL, created_at TEXT NOT NULL
  )`);
  const insert = db.prepare('INSERT INTO products (id, sku, price, created_at) VALUES (?, ?, ?, ?)');
  for (let id = 1; id <= 200; id += 1) {
    const price = ((id * 7) % 20) * 1000;
    const day = String(1 + Math.floor(((id * 3) % 200) / 5)).padStart(2, '0');
    insert.run(id, `SKU-${id}`, price, `2026-${id % 2 ? '09' : '10'}-${day}T08:00:00.000Z`);
  }
  return db;
}

function allRows(db, orderBy) {
  return db
    .prepare(`SELECT id, sku, price, created_at FROM products ORDER BY ${orderBy}`)
    .all()
    .map((r) => ({ id: r.id, sku: r.sku, price: r.price, createdAt: r.created_at }));
}

function walk(db, options) {
  const pages = [];
  let after;
  for (let guard = 0; guard < 1000; guard += 1) {
    const page = listProducts(db, { ...options, after });
    pages.push(page);
    if (page.nextCursor === null) return pages;
    after = page.nextCursor;
  }
  throw new Error('nextCursor không bao giờ về null: vòng lặp vô hạn');
}

test('encodeCursor/decodeCursor: khứ hồi, base64url, cursor hỏng thì lỗi', () => {
  const data = { sort: 'price', value: 12000, id: 57, note: 'đơn +/=' };
  const cursor = encodeCursor(data);
  assert.equal(typeof cursor, 'string');
  assert.doesNotMatch(cursor, /[+/=]/, 'base64url không có + / =');
  assert.deepEqual(decodeCursor(cursor), data);
  assert.throws(() => decodeCursor('không phải cursor!!'), /cursor/i);
  assert.throws(() => decodeCursor(Buffer.from('{"a":').toString('base64url')), /cursor/i, 'JSON hỏng');
  assert.throws(() => decodeCursor(Buffer.from('42').toString('base64url')), /cursor/i, 'không phải object');
});

test('trang đầu sắp theo price rồi id, trả object thường', () => {
  const db = createDb();
  const page = listProducts(db, { limit: 20 });
  const expected = allRows(db, 'price ASC, id ASC').slice(0, 20);
  assert.deepEqual(page.items.map((r) => ({ ...r })), expected);
  assert.equal(Object.getPrototypeOf(page.items[0]), Object.prototype, 'trả object thường, không phải row prototype null');
  assert.equal(typeof page.nextCursor, 'string');
});

test('đi hết các trang theo price: đủ 200 dòng, không trùng, đúng thứ tự', () => {
  const db = createDb();
  const pages = walk(db, { limit: 30 });
  assert.equal(pages.length, 7, '200 dòng / 30 mỗi trang = 7 trang');
  const ids = pages.flatMap((p) => p.items.map((r) => r.id));
  assert.deepEqual(ids, allRows(db, 'price ASC, id ASC').map((r) => r.id), 'ranh giới trang cắt giữa nhóm cùng giá vẫn không trùng/mất');
  assert.equal(pages.at(-1).nextCursor, null);
});

test('trang cuối vừa đủ limit thì nextCursor là null (không trả trang rỗng)', () => {
  const db = createDb();
  const pages = walk(db, { limit: 50 });
  assert.equal(pages.length, 4);
  assert.ok(pages.every((p) => p.items.length === 50));
});

test('sort createdAt: mới nhất trước, trùng thời điểm thì id giảm dần', () => {
  const db = createDb();
  const pages = walk(db, { limit: 17, sort: 'createdAt' });
  const ids = pages.flatMap((p) => p.items.map((r) => r.id));
  assert.deepEqual(ids, allRows(db, 'created_at DESC, id DESC').map((r) => r.id));
});

test('chèn dòng mới giữa hai lần gọi không làm trùng dòng (điểm yếu của OFFSET)', () => {
  const db = createDb();
  const first = listProducts(db, { limit: 50 });
  const insert = db.prepare('INSERT INTO products (sku, price, created_at) VALUES (?, ?, ?)');
  for (let i = 0; i < 5; i += 1) insert.run(`NEW-${i}`, 0, '2026-10-31T00:00:00.000Z');
  const seen = new Set(first.items.map((r) => r.id));
  let after = first.nextCursor;
  let count = first.items.length;
  while (after) {
    const page = listProducts(db, { limit: 50, after });
    for (const row of page.items) {
      assert.equal(seen.has(row.id), false, `dòng id ${row.id} xuất hiện hai lần`);
      seen.add(row.id);
    }
    count += page.items.length;
    after = page.nextCursor;
  }
  assert.equal(count, 200, '5 dòng mới có giá 0 nằm trước cursor nên không xuất hiện, 200 dòng cũ đủ cả');
});

test('tham số sai: limit, sort lạ, cursor của kiểu sort khác, cursor thiếu dữ liệu', () => {
  const db = createDb();
  assert.throws(() => listProducts(db, { limit: 0 }), RangeError);
  assert.throws(() => listProducts(db, { limit: 101 }), RangeError);
  assert.throws(() => listProducts(db, { limit: 2.5 }), RangeError);
  assert.throws(() => listProducts(db, { sort: 'price; DROP TABLE products' }));
  const priceCursor = listProducts(db, { limit: 5 }).nextCursor;
  assert.throws(() => listProducts(db, { sort: 'createdAt', after: priceCursor }), /cursor/i);
  assert.throws(() => listProducts(db, { after: encodeCursor({ sort: 'price' }) }), /cursor/i);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products').get().n, 200, 'bảng vẫn còn nguyên');
});
