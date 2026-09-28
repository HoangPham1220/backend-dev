import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createProductRepository, createOrderRepository } from './exercise.js';

const SEED = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(SEED);
  return { db, products: createProductRepository(db), orders: createOrderRepository(db) };
}

const count = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const skus = (page) => page?.items?.map((product) => product.sku);

const AO_001 = { id: 1, sku: 'AO-001', name: 'Áo thun basic trắng', categoryId: 1, price: 150000, stock: 40, status: 'active' };

describe('productRepository', () => {
  test('findBySku: trả object camelCase thường, không có thì null', () => {
    const { products } = setup();
    assert.deepEqual(products.findBySku('AO-001'), AO_001, 'object thường với categoryId (không phải category_id), không phải row thô');
    assert.deepEqual(products.findBySku('PK-005')?.categoryId, null);
    assert.equal(products.findBySku('XX-999'), null);
  });

  test('create: tạo sản phẩm với giá trị mặc định', () => {
    const { products } = setup();
    assert.deepEqual(products.create({ sku: 'AO-006', name: 'Áo polo', price: 250000 }), {
      id: 19, sku: 'AO-006', name: 'Áo polo', categoryId: null, price: 250000, stock: 0, status: 'active',
    });
    assert.deepEqual(products.create({ sku: 'QU-005', name: 'Quần jogger', price: 320000, stock: 12, categoryId: 2 }), {
      id: 20, sku: 'QU-005', name: 'Quần jogger', categoryId: 2, price: 320000, stock: 12, status: 'active',
    });
  });

  test('create: sku trùng → lỗi dễ hiểu', () => {
    const { db, products } = setup();
    assert.throws(() => products.create({ sku: 'AO-001', name: 'Trùng', price: 1 }), { message: 'SKU đã tồn tại: AO-001' });
    assert.equal(count(db, 'products'), 18);
  });

  test('list: mặc định trang 1, 10 sản phẩm, sắp theo id', () => {
    const { products } = setup();
    const page = products.list();
    assert.equal(page?.items?.length, 10);
    assert.deepEqual(page.items[0], AO_001, 'items là product dạng camelCase');
    assert.deepEqual({ ...page, items: undefined }, { items: undefined, total: 18, page: 1, perPage: 10, totalPages: 2 });
  });

  test('list: phân trang', () => {
    const { products } = setup();
    const page = products.list({ page: 2, perPage: 5 });
    assert.deepEqual(skus(page), ['QU-001', 'QU-002', 'QU-003', 'QU-004', 'GI-001'], 'trang 2 là id 6..10');
    assert.equal(page.totalPages, 4, '18 sản phẩm / 5 mỗi trang = 4 trang');
    assert.deepEqual(skus(products.list({ page: 4, perPage: 5 })), ['PK-003', 'PK-004', 'PK-005'], 'trang cuối thiếu dòng');
    assert.deepEqual(skus(products.list({ page: 9, perPage: 5 })), [], 'trang vượt quá thì items rỗng');
  });

  test('list: tìm theo tên, total đếm mọi dòng khớp', () => {
    const { products } = setup();
    const page = products.list({ q: 'Áo', perPage: 2 });
    assert.deepEqual(skus(page), ['AO-001', 'AO-002']);
    assert.equal(page.total, 5, 'total là số sản phẩm khớp (5), không phải số dòng của trang (2)');
    assert.equal(page.totalPages, 3);
    const empty = products.list({ q: 'không có' });
    assert.deepEqual({ items: empty.items, total: empty.total, totalPages: empty.totalPages }, { items: [], total: 0, totalPages: 0 });
  });

  test('list: sắp xếp, trùng giá thì theo id', () => {
    const { products } = setup();
    assert.deepEqual(skus(products.list({ sortBy: 'price', sortDir: 'desc', perPage: 3 })), ['GI-004', 'GI-002', 'GI-001']);
    assert.deepEqual(
      skus(products.list({ sortBy: 'price', perPage: 4 })),
      ['PK-003', 'GI-003', 'PK-001', 'AO-001'],
      'GI-003 (id 12) và PK-001 (id 14) cùng giá 120000: id nhỏ trước',
    );
  });

  test('list: chặn sortBy/sortDir lạ (chống injection qua ORDER BY)', () => {
    const { db, products } = setup();
    assert.throws(() => products.list({ sortBy: 'price; DROP TABLE products' }), { message: 'sortBy không hợp lệ: price; DROP TABLE products' });
    assert.throws(() => products.list({ sortBy: 'sku' }), { message: 'sortBy không hợp lệ: sku' }, 'chỉ id, name, price, stock');
    assert.throws(() => products.list({ sortDir: 'DESC; --' }), { message: 'sortDir không hợp lệ: DESC; --' });
    assert.equal(count(db, 'products'), 18);
  });

  test('list: page/perPage sai → RangeError', () => {
    const { products } = setup();
    for (const options of [{ page: 0 }, { page: 1.5 }, { perPage: 0 }, { perPage: 101 }, { page: '2' }]) {
      assert.throws(() => products.list(options), RangeError, `${JSON.stringify(options)} phải bị chặn`);
    }
  });

  test('update: sửa field cho phép, trả product mới', () => {
    const { products } = setup();
    assert.deepEqual(products.update('AO-001', { price: 170000, stock: 35 }), { ...AO_001, price: 170000, stock: 35 });
    assert.deepEqual(products.findBySku('AO-001').price, 170000, 'phải ghi vào DB thật');
    assert.deepEqual(products.update('AO-001', {}), { ...AO_001, price: 170000, stock: 35 }, 'changes rỗng → trả product hiện tại');
    assert.equal(products.update('XX-999', { price: 1 }), null);
  });

  test('update: key lạ → lỗi, không sửa gì', () => {
    const { products } = setup();
    assert.throws(() => products.update('AO-001', { price: 1, sku: 'HACK' }), { message: 'Không cho phép cập nhật: sku' });
    assert.throws(() => products.update('AO-001', { 'price = 0, stock': 0 }), /Không cho phép cập nhật/, 'tên key cũng là input, không được ghép thẳng vào SQL');
    assert.deepEqual(products.findBySku('AO-001'), AO_001, 'price không được đổi thành 1');
  });

  test('delete: xoá được sản phẩm chưa bán, chặn sản phẩm đã có trong đơn', () => {
    const { db, products } = setup();
    assert.equal(products.delete('PK-004'), true);
    assert.equal(products.findBySku('PK-004'), null);
    assert.equal(products.delete('PK-004'), false, 'xoá lần hai: không còn gì để xoá');
    assert.throws(() => products.delete('AO-001'), { message: 'Sản phẩm đang có trong đơn hàng: AO-001' });
    assert.equal(count(db, 'products'), 17);
  });
});

describe('orderRepository', () => {
  test('getOrderWithItems: đơn đầy đủ kèm items', () => {
    const { orders } = setup();
    assert.deepEqual(orders.getOrderWithItems(6), {
      id: 6, customerId: 2, status: 'paid', createdAt: '2026-07-14 16:30:00', total: 930000,
      items: [
        { sku: 'AO-001', name: 'Áo thun basic trắng', price: 150000, quantity: 3, lineTotal: 450000 },
        { sku: 'QU-003', name: 'Quần short thể thao', price: 180000, quantity: 2, lineTotal: 360000 },
        { sku: 'PK-001', name: 'Mũ lưỡi trai', price: 120000, quantity: 1, lineTotal: 120000 },
      ],
    });
    assert.equal(orders.getOrderWithItems(999), null);
  });

  test('listByCustomer: đơn mới nhất trước, kèm tổng tiền', () => {
    const { orders } = setup();
    assert.deepEqual(orders.listByCustomer(1), [
      { id: 11, status: 'pending', createdAt: '2026-08-30 22:15:00', total: 520000 },
      { id: 4, status: 'shipped', createdAt: '2026-07-02 08:40:00', total: 1250000 },
      { id: 1, status: 'shipped', createdAt: '2026-06-03 09:15:00', total: 750000 },
    ]);
    assert.deepEqual(orders.listByCustomer(7), [], 'khách chưa có đơn → mảng rỗng');
  });

  test('placeOrder: tạo đơn, trả về đơn đầy đủ', () => {
    const { db, orders } = setup();
    const order = orders.placeOrder({ customerId: 7, items: [{ sku: 'GI-001', quantity: 1 }, { sku: 'PK-003', quantity: 2 }] });
    assert.equal(order?.id, 16);
    assert.equal(order.customerId, 7);
    assert.equal(order.status, 'pending');
    assert.match(order.createdAt ?? '', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(order.total, 1070000);
    assert.deepEqual(order.items, [
      { sku: 'GI-001', name: 'Giày sneaker trắng', price: 890000, quantity: 1, lineTotal: 890000 },
      { sku: 'PK-003', name: 'Tất cổ ngắn (combo 5 đôi)', price: 90000, quantity: 2, lineTotal: 180000 },
    ]);
    assert.equal(db.prepare("SELECT stock FROM products WHERE sku = 'GI-001'").get().stock, 9);
  });

  test('placeOrder: thiếu hàng → rollback toàn bộ', () => {
    const { db, orders, products } = setup();
    assert.throws(
      () => orders.placeOrder({ customerId: 7, items: [{ sku: 'AO-001', quantity: 1 }, { sku: 'GI-002', quantity: 99 }] }),
      { message: 'Không đủ hàng: GI-002' },
    );
    assert.equal(products.findBySku('AO-001')?.stock, 40, 'AO-001 không được bị trừ');
    assert.equal(count(db, 'orders'), 15);
    assert.equal(db.isTransaction, false);
    assert.throws(() => orders.placeOrder({ customerId: 7, items: [] }), /ít nhất một sản phẩm/);
  });
});
