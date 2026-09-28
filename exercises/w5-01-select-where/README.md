# w5-01 · SELECT, WHERE, ORDER BY, LIMIT

**Mục tiêu:** viết tay các truy vấn đọc dữ liệu cơ bản: lọc, sắp xếp, phân trang, `LIKE`, `IN`, `IS NULL`.

## So với PHP / Magento

Ở Magento bạn thường viết `$collection->addFieldToFilter('status', 'active')->setOrder('price', 'DESC')`,
và collection tự sinh SQL. Từ tuần này bạn viết thẳng câu SQL đó. Chạy `->getSelect()->__toString()` trên một
collection Magento là thấy nó cũng chỉ là `SELECT ... WHERE ... ORDER BY ... LIMIT`.

Bài chạy trên SQLite có sẵn trong Node (không cần cài gì). Dự án thật sẽ dùng PostgreSQL, nhưng các câu trong bài
này là SQL chuẩn, chạy được ở cả hai.

## Dữ liệu mẫu

Test nạp `seed.sql` vào một DB SQLite mới trong bộ nhớ. Mở file đó để xem toàn bộ dữ liệu.

```
categories  (id, name)
customers   (id, name, email UNIQUE, city NULL được, created_at)
products    (id, sku UNIQUE, name, category_id → categories NULL được, price, stock, status 'active'|'disabled')
orders      (id, customer_id → customers, status 'pending'|'paid'|'shipped'|'cancelled', created_at 'YYYY-MM-DD HH:MM:SS')
order_items (id, order_id → orders, product_id → products, price = giá lúc đặt, quantity)
```

Chạy thử một câu SQL trên dữ liệu mẫu:

```bash
node --disable-warning=ExperimentalWarning exercises/w5-01-select-where/thu-sql.js "SELECT * FROM products LIMIT 5"
```

## Yêu cầu

Viết mỗi câu SQL vào một chuỗi trong `exercise.js`. **Tên cột và thứ tự dòng phải đúng như mô tả.**

1. `activeInStockSql`: sản phẩm `status = 'active'` **và** còn hàng (`stock > 0`).
   Cột: `sku, name, price`. Sắp giá giảm dần; cùng giá thì `sku` tăng dần.
2. `cheapestPageSql`: sản phẩm active sắp giá tăng dần (cùng giá thì `sku` tăng dần),
   lấy **trang 2**, mỗi trang 5 sản phẩm. Cột: `sku, price`.
3. `customersInBigCitiesSql`: khách ở `'Hà Nội'` hoặc `'TP HCM'`, dùng `IN`. Cột: `id, name, city`. Sắp theo `id`.
4. `customersMissingCitySql`: khách chưa có thành phố. Cột: `id, name`. Sắp theo `id`.
5. `gmailCustomersSql`: khách có email đuôi `@gmail.com`. Cột: `id, name, email`. Sắp theo `id`.

## Chạy

```bash
npm run check w5-01
npm run watch w5-01
```

## Tự kiểm tra sau khi đạt

1. Vì sao `WHERE city = NULL` không trả về dòng nào, trong khi `WHERE city IS NULL` thì có?
2. Trang thứ `n` (bắt đầu từ 1), mỗi trang `k` dòng thì `OFFSET` bằng bao nhiêu? Vì sao phân trang mà không có
   `ORDER BY` là lỗi?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Sắp theo nhiều cột: `ORDER BY price DESC, sku ASC`.
- Phân trang: `LIMIT <số dòng> OFFSET <số dòng bỏ qua>`.
- `LIKE '%abc'` khớp chuỗi kết thúc bằng `abc`.
- So sánh với `NULL` luôn cho kết quả "không biết", nên phải dùng `IS NULL`.

</details>
