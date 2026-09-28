# w6-01 · Prepared statement và SQL injection

**Mục tiêu:** chạy SQL từ code Node với tham số an toàn (`?`), hiểu vì sao **không bao giờ** ghép chuỗi input vào SQL.

## SQL injection là gì

Code ghép chuỗi:

```js
db.prepare(`SELECT * FROM customers WHERE email = '${email}'`).get();
```

Nếu `email` là `' OR '1'='1` thì câu SQL thành `... WHERE email = '' OR '1'='1'`: điều kiện luôn đúng,
kẻ tấn công lấy được dữ liệu khách đầu tiên (hoặc tất cả). Tệ hơn, nhiều driver cho chạy nhiều câu một lúc:
`x'; DROP TABLE customers; --`.

Prepared statement tách **câu lệnh** và **dữ liệu**: database biên dịch câu có dấu `?` trước, rồi mới nhận giá trị.
Giá trị không bao giờ được hiểu là SQL.

```js
db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
```

## So với PHP / Magento

Giống PDO: `$stmt = $pdo->prepare('... WHERE email = ?'); $stmt->execute([$email]);`. Magento bọc bằng
`$connection->quoteInto()` hoặc bind trong `$select->where('email = ?', $email)`.

API `node:sqlite` dùng trong bài:

```js
db.prepare(sql).get(...params);  // một dòng hoặc undefined
db.prepare(sql).all(...params);  // mảng các dòng
db.prepare(sql).run(...params);  // INSERT/UPDATE/DELETE → { changes, lastInsertRowid }
```

Mỗi dòng trả về là object "không prototype". Muốn trả object thường thì chép lại: `{ ...row }`.

## Dữ liệu mẫu

Test nạp `seed.sql` vào một DB SQLite mới trong bộ nhớ. Mở file đó để xem toàn bộ dữ liệu.

```
categories  (id, name)
customers   (id, name, email UNIQUE, city NULL được, created_at)
products    (id, sku UNIQUE, name, category_id → categories NULL được, price, stock, status 'active'|'disabled')
orders      (id, customer_id → customers, status 'pending'|'paid'|'shipped'|'cancelled', created_at 'YYYY-MM-DD HH:MM:SS')
order_items (id, order_id → orders, product_id → products, price = giá lúc đặt, quantity)
```
Test nạp thêm một khách có email chứa dấu nháy đơn `o'neil@example.com` và một sản phẩm tên có ký tự `%`.

## Yêu cầu

Mọi giá trị đến từ tham số phải đi qua dấu `?`, không ghép vào chuỗi SQL.

1. `findCustomerByEmail(db, email)` → `{ id, name, email, city }`, hoặc `null` nếu không có.
2. `searchProducts(db, keyword)` → sản phẩm **active** có tên chứa `keyword`, dạng `[{ sku, name, price }]`,
   sắp theo `sku`. **Nâng cao:** `%` và `_` trong keyword phải được hiểu là ký tự thường, không phải
   wildcard. Ví dụ `searchProducts(db, '%')` chỉ trả sản phẩm có dấu `%` trong tên, không trả tất cả.
3. `countOrdersByStatus(db, statuses)` → số đơn có status nằm trong mảng `statuses`. Mảng có độ dài bất kỳ;
   mảng rỗng → `0`. Mỗi status là một dấu `?` riêng trong `IN (...)`.

## Khác biệt với PostgreSQL

Thư viện `pg` của PostgreSQL dùng `$1, $2` thay cho `?`: `client.query('... WHERE email = $1', [email])`.
`LIKE` của PostgreSQL phân biệt hoa thường; muốn không phân biệt dùng `ILIKE`.

## Chạy

```bash
npm run check w6-01
npm run watch w6-01
```

## Tự kiểm tra sau khi đạt

1. Có thể dùng `?` cho **tên cột** trong `ORDER BY ?` không? Nếu người dùng được chọn cột sắp xếp thì chống
   injection bằng cách nào?
2. Vì sao "tự escape dấu nháy đơn bằng `replace`" không phải cách chống injection đáng tin?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Giá trị truyền cho `LIKE ?` là chuỗi `"%" + keyword + "%"`: các dấu `%` bao quanh nằm trong **giá trị**, không nằm trong SQL.
- Phần nâng cao: trong SQL, `LIKE ? ESCAPE '\'` (một dấu gạch ngược) nghĩa là `\%` khớp dấu `%` thật.
  Trong chuỗi JavaScript, dấu gạch ngược phải viết đôi: `"\\"`. Cần chèn gạch ngược trước mỗi `%`, `_` và gạch ngược có sẵn trong keyword.
- Câu 3: tạo chuỗi `'?, ?, ?'` có số dấu `?` bằng độ dài mảng, rồi truyền `...statuses`.

</details>
