# w5-06 · Index và EXPLAIN QUERY PLAN

**Mục tiêu:** tạo index đúng cho truy vấn cho trước, và đọc query plan để **kiểm chứng** index có được dùng thật.

## So với PHP / Magento

Khi support Magento, "admin grid / trang category chậm" thường do truy vấn quét cả bảng (full table scan) trên
bảng lớn. Công cụ tương đương là `EXPLAIN` của MySQL. Ở đây dùng `EXPLAIN QUERY PLAN` của SQLite:

- `SCAN orders`: đọc toàn bộ bảng. Bảng 10 triệu dòng thì đọc 10 triệu dòng.
- `SEARCH orders USING INDEX ...`: nhảy thẳng tới các dòng cần.
- `USE TEMP B-TREE FOR ORDER BY`: phải sắp xếp lại kết quả trong bộ nhớ tạm.

## Dữ liệu mẫu

Test nạp `seed.sql` vào một DB SQLite mới trong bộ nhớ. Mở file đó để xem toàn bộ dữ liệu.

```
categories  (id, name)
customers   (id, name, email UNIQUE, city NULL được, created_at)
products    (id, sku UNIQUE, name, category_id → categories NULL được, price, stock, status 'active'|'disabled')
orders      (id, customer_id → customers, status 'pending'|'paid'|'shipped'|'cancelled', created_at 'YYYY-MM-DD HH:MM:SS')
order_items (id, order_id → orders, product_id → products, price = giá lúc đặt, quantity)
```
Xem plan của một câu:

```bash
node --disable-warning=ExperimentalWarning exercises/w5-06-index/thu-sql.js "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 1"
```

`thu-sql.js` chỉ nạp `seed.sql`, chưa có index của bạn, nên dùng nó để xem plan **trước** khi tạo index.
Plan **sau** khi có index của bạn: chạy `npm run check w5-06`, test trượt sẽ in plan thực tế.

## Yêu cầu

Viết các câu `CREATE INDEX` vào chuỗi `indexSql` để **cả 3 truy vấn** sau đều dùng index:

```sql
-- Q1: lịch sử đơn của một khách, mới nhất trước (trang "My Orders")
SELECT id, status, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC;

-- Q2: sản phẩm này đã nằm trong những đơn nào
SELECT order_id, quantity FROM order_items WHERE product_id = ?;

-- Q3: khách theo thành phố
SELECT id, name FROM customers WHERE city = ?;
```

Luật:

1. Không truy vấn nào còn `SCAN` cả bảng.
2. Q1 **không** được còn bước `USE TEMP B-TREE FOR ORDER BY`, tức index phải phục vụ luôn việc sắp xếp.
3. Tối đa **3 index**. Index không miễn phí: mỗi lần INSERT/UPDATE đều phải cập nhật index.
4. Không tạo index trên `products`: `sku` đã `UNIQUE` nên đã có index tự động.

## Chạy

```bash
npm run check w5-06
npm run watch w5-06
```

## Tự kiểm tra sau khi đạt

1. Index `(customer_id, created_at)` có giúp được truy vấn `WHERE created_at > ?` (không lọc customer_id) không?
   Vì sao thứ tự cột trong index quan trọng?
2. `WHERE name LIKE '%jean%'` có dùng được index trên `name` không? Còn `LIKE 'Quần%'` thì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Cú pháp: `CREATE INDEX idx_ten ON bang (cot1, cot2);`
- Index nhiều cột dùng được cho `WHERE cot1 = ?` **và** sắp xếp theo `cot2` trong cùng nhóm `cot1`.
  SQLite đọc index được cả chiều ngược, nên `DESC` không cần index riêng.

</details>
