-- Dữ liệu mẫu cửa hàng thời trang. Dùng chung cho các bài SQL tuần 5–6.
-- Giá tính bằng VND (số nguyên). Thời gian lưu dạng chuỗi 'YYYY-MM-DD HH:MM:SS'.
PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  city       TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  price       INTEGER NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status      TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status      TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  price      INTEGER NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0)
);

INSERT INTO categories (id, name) VALUES
  (1, 'Áo'),
  (2, 'Quần'),
  (3, 'Giày'),
  (4, 'Phụ kiện');

INSERT INTO customers (id, name, email, city, created_at) VALUES
  (1,  'Nguyễn Văn An',   'an.nguyen@example.com',  'Hà Nội',  '2026-01-05 10:00:00'),
  (2,  'Trần Thị Bình',   'binh.tran@example.com',  'TP HCM',  '2026-01-12 09:30:00'),
  (3,  'Lê Minh Châu',    'chau.le@example.com',    'Đà Nẵng', '2026-02-03 15:45:00'),
  (4,  'Phạm Quốc Dũng',  'dung.pham@example.com',  NULL,      '2026-02-20 08:10:00'),
  (5,  'Hoàng Thu Hà',    'ha.hoang@example.com',   'Hà Nội',  '2026-03-08 19:20:00'),
  (6,  'Vũ Đức Huy',      'huy.vu@example.com',     'TP HCM',  '2026-03-15 11:05:00'),
  (7,  'Đỗ Ngọc Lan',     'lan.do@example.com',     NULL,      '2026-04-01 07:55:00'),
  (8,  'Bùi Thanh Long',  'long.bui@example.com',   'Cần Thơ', '2026-04-22 13:40:00'),
  (9,  'Ngô Bảo Ngọc',    'ngoc.ngo@gmail.com',     'Hà Nội',  '2026-05-10 21:15:00'),
  (10, 'Đặng Hải Yến',    'yen.dang@gmail.com',     'Huế',     '2026-06-18 16:00:00');

INSERT INTO products (id, sku, name, category_id, price, stock, status) VALUES
  (1,  'AO-001', 'Áo thun basic trắng',        1,    150000,  40, 'active'),
  (2,  'AO-002', 'Áo thun basic đen',          1,    150000,   0, 'active'),
  (3,  'AO-003', 'Áo sơ mi oxford',            1,    350000,  12, 'active'),
  (4,  'AO-004', 'Áo khoác gió',               1,    550000,   5, 'active'),
  (5,  'AO-005', 'Áo len cổ lọ',               1,    420000,   8, 'disabled'),
  (6,  'QU-001', 'Quần jean slim',             2,    450000,  20, 'active'),
  (7,  'QU-002', 'Quần kaki',                  2,    380000,   0, 'active'),
  (8,  'QU-003', 'Quần short thể thao',        2,    180000,  30, 'active'),
  (9,  'QU-004', 'Quần tây công sở',           2,    520000,   6, 'active'),
  (10, 'GI-001', 'Giày sneaker trắng',         3,    890000,  10, 'active'),
  (11, 'GI-002', 'Giày chạy bộ',               3,   1250000,   4, 'active'),
  (12, 'GI-003', 'Dép quai ngang',             3,    120000,  50, 'active'),
  (13, 'GI-004', 'Giày da công sở',            3,   1450000,   2, 'disabled'),
  (14, 'PK-001', 'Mũ lưỡi trai',               4,    120000,  25, 'active'),
  (15, 'PK-002', 'Thắt lưng da',               4,    290000,  15, 'active'),
  (16, 'PK-003', 'Tất cổ ngắn (combo 5 đôi)',  4,     90000,  60, 'active'),
  (17, 'PK-004', 'Balo laptop',                4,    650000,   0, 'active'),
  (18, 'PK-005', 'Ví da nam',                  NULL, 320000,   7, 'active');

-- Chỉ đơn 'paid' và 'shipped' được tính doanh thu. 'pending' chưa thanh toán, 'cancelled' đã huỷ.
INSERT INTO orders (id, customer_id, status, created_at) VALUES
  (1,  1, 'shipped',   '2026-06-03 09:15:00'),
  (2,  2, 'shipped',   '2026-06-10 14:20:00'),
  (3,  3, 'paid',      '2026-06-21 20:05:00'),
  (4,  1, 'shipped',   '2026-07-02 08:40:00'),
  (5,  5, 'cancelled', '2026-07-05 11:00:00'),
  (6,  2, 'paid',      '2026-07-14 16:30:00'),
  (7,  6, 'shipped',   '2026-07-28 19:45:00'),
  (8,  4, 'cancelled', '2026-08-02 10:10:00'),
  (9,  8, 'shipped',   '2026-08-09 13:25:00'),
  (10, 9, 'paid',      '2026-08-15 21:00:00'),
  (11, 1, 'pending',   '2026-08-30 22:15:00'),
  (12, 3, 'shipped',   '2026-09-04 07:50:00'),
  (13, 5, 'paid',      '2026-09-12 12:00:00'),
  (14, 6, 'pending',   '2026-09-20 18:30:00'),
  (15, 2, 'shipped',   '2026-09-25 09:05:00');

-- price trong order_items là giá tại thời điểm đặt hàng (có thể khác giá hiện tại của sản phẩm).
INSERT INTO order_items (id, order_id, product_id, price, quantity) VALUES
  (1,  1,  1,  150000, 2),
  (2,  1,  6,  450000, 1),
  (3,  2,  10, 890000, 1),
  (4,  2,  16,  90000, 2),
  (5,  3,  3,  350000, 1),
  (6,  3,  15, 290000, 1),
  (7,  4,  11, 1250000, 1),
  (8,  5,  4,  550000, 1),
  (9,  6,  1,  150000, 3),
  (10, 6,  8,  180000, 2),
  (11, 6,  14, 120000, 1),
  (12, 7,  6,  450000, 2),
  (13, 7,  10, 890000, 1),
  (14, 8,  12, 120000, 2),
  (15, 9,  16,  90000, 3),
  (16, 9,  12, 120000, 1),
  (17, 10, 4,  550000, 1),
  (18, 10, 3,  350000, 2),
  (19, 11, 9,  520000, 1),
  (20, 12, 1,  150000, 1),
  (21, 12, 14, 120000, 2),
  (22, 13, 11, 1250000, 1),
  (23, 13, 16,  90000, 1),
  (24, 14, 15, 290000, 2),
  (25, 15, 6,  450000, 1),
  (26, 15, 8,  180000, 1);
