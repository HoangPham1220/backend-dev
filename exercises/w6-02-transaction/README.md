# w6-02 · Transaction: đặt hàng và trừ tồn kho

**Mục tiêu:** gom nhiều câu lệnh ghi thành một **transaction**: hoặc tất cả thành công, hoặc không có gì thay đổi.

## Vì sao cần

Đặt một đơn gồm 3 sản phẩm = trừ tồn kho 3 lần + tạo 1 order + tạo 3 order_items. Nếu sản phẩm thứ 3 hết hàng
mà hai sản phẩm đầu **đã bị trừ tồn kho**, kho sẽ lệch mà không có đơn nào tương ứng. Transaction chặn việc đó:

```js
db.exec('BEGIN');
try {
  // ... các câu INSERT/UPDATE ...
  db.exec('COMMIT');   // ghi thật tất cả
} catch (error) {
  db.exec('ROLLBACK'); // huỷ tất cả, như chưa từng chạy
  throw error;         // báo lỗi tiếp cho nơi gọi
}
```

## So với PHP / Magento

Magento: `$connection->beginTransaction(); ... ->commit(); / ->rollBack();`. Lỗi "oversell" (bán quá tồn)
khi nhiều khách checkout cùng lúc là chuyện support Magento hay gặp. Cách chống trong bài này:

```sql
UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
```

Câu này **kiểm tra và trừ trong một bước**, không có khe hở giữa "đọc tồn kho" và "ghi tồn kho".
`.run(...).changes` bằng `0` nghĩa là không đủ hàng. Cách "SELECT stock trước, if đủ thì UPDATE" có khe hở
khi hai request chạy cùng lúc.

## Dữ liệu mẫu

Test nạp `seed.sql` vào một DB SQLite mới trong bộ nhớ. Mở file đó để xem toàn bộ dữ liệu.

```
categories  (id, name)
customers   (id, name, email UNIQUE, city NULL được, created_at)
products    (id, sku UNIQUE, name, category_id → categories NULL được, price, stock, status 'active'|'disabled')
orders      (id, customer_id → customers, status 'pending'|'paid'|'shipped'|'cancelled', created_at 'YYYY-MM-DD HH:MM:SS')
order_items (id, order_id → orders, product_id → products, price = giá lúc đặt, quantity)
```
Test bật khoá ngoại (`PRAGMA foreign_keys = ON` có sẵn trong `seed.sql`).

## Yêu cầu

`placeOrder(db, { customerId, items })`, với `items` dạng `[{ sku, quantity }]`, trả về `{ orderId, total }`.

1. **Kiểm tra đầu vào trước khi đụng DB:**
   - `items` rỗng → throw `Error` có message chứa `'ít nhất một sản phẩm'`.
   - `quantity` không phải số nguyên dương → throw `Error` message `'Số lượng không hợp lệ: <sku>'`.
2. Trong **một transaction**, với từng item:
   - Tìm sản phẩm theo `sku`, chỉ nhận sản phẩm `active`. Không có → `'Không tìm thấy sản phẩm: <sku>'`.
   - Trừ tồn kho bằng một câu UPDATE có điều kiện `stock >= ?`. Không đủ → `'Không đủ hàng: <sku>'`.
3. Tạo `orders` (status `'pending'`, `created_at` = `CURRENT_TIMESTAMP`) và các `order_items` với
   `price` = **giá hiện tại** của sản phẩm.
4. `total` = tổng `price × quantity`.
5. Bất kỳ lỗi nào (kể cả lỗi khoá ngoại khi `customerId` không tồn tại) → `ROLLBACK` rồi throw lại **đúng lỗi đó**.
   Sau lỗi, DB không được kẹt trong transaction (`db.isTransaction` phải là `false`).

## Khác biệt với PostgreSQL

Với thư viện `pg` dùng **pool** kết nối, `BEGIN`, các câu lệnh và `COMMIT` phải chạy trên **cùng một client**
(`const client = await pool.connect()`). Gọi `pool.query('BEGIN')` rồi `pool.query(...)` có thể rơi vào
các kết nối khác nhau, và transaction vô tác dụng. Đây là lỗi rất hay gặp.

## Chạy

```bash
npm run check w6-02
npm run watch w6-02
```

## Tự kiểm tra sau khi đạt

1. Nếu quên `ROLLBACK` trong `catch` thì lần gọi `placeOrder` tiếp theo gặp chuyện gì?
2. Vì sao `order_items.price` lấy giá lúc đặt, và điều đó liên quan gì tới việc sửa giá sản phẩm sau này?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Viết phần kiểm tra đầu vào trước `BEGIN`: lỗi đầu vào không cần transaction.
- `db.prepare(sql).run(...)` trả về `{ changes, lastInsertRowid }`. `lastInsertRowid` là id của order vừa tạo.
- Có thể chuẩn bị (`prepare`) mỗi câu một lần trước vòng lặp, rồi `.run()` nhiều lần.

</details>
