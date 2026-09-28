# w5-04 · Subquery, CTE, window function

**Mục tiêu:** viết truy vấn nhiều bước: subquery (`NOT EXISTS`, subquery trả một giá trị), CTE `WITH`, và
`ROW_NUMBER()` để lấy top N mỗi nhóm.

## So với PHP

"Top 3 sản phẩm bán chạy mỗi danh mục" nếu làm bằng PHP sẽ là: lấy hết dữ liệu, nhóm bằng mảng, sort từng nhóm,
cắt 3 phần tử. Window function làm việc đó ngay trong database. Đây là câu hỏi phỏng vấn SQL rất phổ biến.

**Luật doanh thu/bán hàng:** chỉ tính đơn `status` là `'paid'` hoặc `'shipped'`.

## Dữ liệu mẫu

Test nạp `seed.sql` vào một DB SQLite mới trong bộ nhớ. Mở file đó để xem toàn bộ dữ liệu.

```
categories  (id, name)
customers   (id, name, email UNIQUE, city NULL được, created_at)
products    (id, sku UNIQUE, name, category_id → categories NULL được, price, stock, status 'active'|'disabled')
orders      (id, customer_id → customers, status 'pending'|'paid'|'shipped'|'cancelled', created_at 'YYYY-MM-DD HH:MM:SS')
order_items (id, order_id → orders, product_id → products, price = giá lúc đặt, quantity)
```

Chạy thử:

```bash
node --disable-warning=ExperimentalWarning exercises/w5-04-subquery-cte/thu-sql.js "SELECT AVG(price) FROM products"
```

## Yêu cầu

**Tên cột và thứ tự dòng phải đúng như mô tả.**

1. `neverSoldSql`: sản phẩm **chưa từng xuất hiện** trong bất kỳ `order_items` nào (tính cả đơn huỷ/pending).
   Dùng `NOT EXISTS`. Cột: `sku, name`. Sắp theo `sku`.
2. `aboveAveragePriceSql`: sản phẩm active có giá **cao hơn giá trung bình của các sản phẩm active**.
   Dùng subquery, không viết cứng con số trung bình. Cột: `sku, price`. Sắp giá giảm dần, rồi `sku`.
3. `topProductsPerCategorySql`: top 3 sản phẩm bán chạy nhất (theo tổng số lượng) **mỗi danh mục**.
   - Chỉ tính sản phẩm có bán và có danh mục.
   - Bằng số lượng thì `sku` nhỏ hơn xếp trước.
   - Danh mục có ít hơn 3 sản phẩm bán được thì lấy bấy nhiêu.
   - Cột: `category_name, sku, units_sold, rank` (rank bắt đầu từ 1). Sắp theo **id danh mục**, rồi `rank`.
   - Dùng `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`.
4. `repeatCustomersSql`: khách có **từ 2 đơn hợp lệ** trở lên. Viết bằng CTE: `WITH valid_orders AS (...)`.
   Cột: `customer_id, name, order_count`. Sắp `order_count` giảm dần, rồi `customer_id`.

## Khác biệt với PostgreSQL / MySQL

`NOT EXISTS`, CTE và `ROW_NUMBER()` chạy giống nhau trên PostgreSQL và MySQL 8+.
MySQL 5.7 (nhiều site Magento cũ) **không có** CTE và window function.

## Chạy

```bash
npm run check w5-04
npm run watch w5-04
```

## Tự kiểm tra sau khi đạt

1. `NOT IN (SELECT product_id FROM ...)` sẽ trả về gì nếu subquery có một giá trị `NULL`? Vì sao `NOT EXISTS`
   an toàn hơn?
2. Nếu dùng `RANK()` thay `ROW_NUMBER()`, kết quả danh mục Giày thay đổi thế nào?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)`: subquery "tham chiếu ra ngoài" tới `p`.
- Câu 3 chia làm hai bước bằng CTE: bước 1 tính `units_sold` mỗi sản phẩm, bước 2 đánh số trong từng danh mục.
  Không lọc `rank <= 3` ngay được ở bước đánh số: phải lọc ở câu `SELECT` bên ngoài.

</details>
