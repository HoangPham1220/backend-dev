# w5-03 · GROUP BY, HAVING, COUNT DISTINCT

**Mục tiêu:** viết báo cáo tổng hợp: nhóm dữ liệu, tính tổng, lọc sau khi nhóm, đếm không trùng lặp.

## So với PHP

Đây là việc mà khi support Magento bạn hay làm bằng vòng lặp PHP trên collection. Để database tổng hợp thì nhanh
hơn nhiều và không phải kéo cả nghìn dòng về PHP/Node.

**Luật doanh thu cho cả bài:** chỉ tính đơn có `status` là `'paid'` hoặc `'shipped'`.
Doanh thu = tổng `order_items.price * order_items.quantity`.

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
node --disable-warning=ExperimentalWarning exercises/w5-03-group-by/thu-sql.js "SELECT status, COUNT(*) FROM orders GROUP BY status"
```

## Yêu cầu

**Tên cột và thứ tự dòng phải đúng như mô tả.**

1. `monthlyRevenueSql`: doanh thu theo tháng. Cột:
   - `month`: dạng `'2026-06'`. Gợi ý: `substr(created_at, 1, 7)` lấy 7 ký tự đầu.
   - `order_count`: số **đơn** trong tháng.
   - `buyer_count`: số **khách khác nhau** mua trong tháng.
   - `revenue`: doanh thu.

   Sắp theo `month` tăng dần.
2. `categoryRevenueSql`: doanh thu theo danh mục. Cột: `category_name, units_sold` (tổng số lượng bán),
   `revenue`. Sắp `revenue` giảm dần.
3. `bigSpendersSql`: khách có tổng chi **lớn hơn 1.500.000**. Cột: `customer_id, name, total_spent`.
   Sắp `total_spent` giảm dần. Phải dùng `HAVING`.

## Chạy

```bash
npm run check w5-03
npm run watch w5-03
```

## Tự kiểm tra sau khi đạt

1. Ở câu 1, vì sao `COUNT(*)` cho ra số lớn hơn số đơn thật? `COUNT(DISTINCT ...)` sửa điều đó thế nào?
2. `WHERE` và `HAVING` khác nhau ở thời điểm lọc ra sao? Điều kiện `status IN (...)` nên đặt ở đâu, vì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Sau khi JOIN `orders` với `order_items`, một đơn có 3 sản phẩm thành 3 dòng. Đếm đơn thì đếm `DISTINCT o.id`.
- Thứ tự thực thi: `FROM/JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY`.
- `HAVING SUM(...) > 1500000` lọc trên kết quả đã nhóm.

</details>
