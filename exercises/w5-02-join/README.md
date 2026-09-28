# w5-02 · JOIN: INNER và LEFT

**Mục tiêu:** ghép dữ liệu nhiều bảng, hiểu khi nào `INNER JOIN` làm mất dòng và khi nào cần `LEFT JOIN`.

## So với PHP / Magento

Trong Magento, `$collection->join(...)` hoặc `joinLeft(...)` của Zend_Db_Select sinh ra đúng hai loại JOIN này.
Lỗi "sản phẩm biến mất khỏi grid admin" hay gặp khi support thường là do INNER JOIN với bảng không có dòng tương ứng.

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
node --disable-warning=ExperimentalWarning exercises/w5-02-join/thu-sql.js "SELECT * FROM orders LIMIT 5"
```

## Yêu cầu

**Tên cột và thứ tự dòng phải đúng như mô tả.** Đặt tên cột bằng `AS` khi cần.

1. `orderDetailsSql`: chi tiết đơn hàng **#6**, ghép 3 bảng `orders`, `order_items`, `products`.
   Cột: `order_id, status, sku, product_name, quantity, line_total` (`line_total` = giá lúc đặt × số lượng).
   Sắp theo `order_items.id`.
2. `customerOrdersSql`: **mọi** khách hàng kèm từng đơn của họ. Khách chưa có đơn vẫn xuất hiện một dòng, với
   `order_id` và `status` là `NULL`. Cột: `customer_id, name, order_id, status`. Sắp theo `customer_id`, rồi `order_id`.
3. `customersWithoutOrdersSql`: khách chưa từng đặt đơn nào. Cột: `id, name`. Sắp theo `id`.
   Dùng `LEFT JOIN`, **không** dùng subquery (subquery để bài w5-04).
4. `productsWithCategorySql`: **mọi** sản phẩm kèm tên danh mục; sản phẩm chưa có danh mục thì
   `category_name` là `NULL`. Cột: `sku, name, category_name`. Sắp theo `sku`.

## Chạy

```bash
npm run check w5-02
npm run watch w5-02
```

## Tự kiểm tra sau khi đạt

Ở câu 4, đổi `LEFT JOIN` thành `INNER JOIN` thì mất sản phẩm nào, vì sao? Trong một báo cáo tồn kho thật,
việc mất dòng như vậy gây hậu quả gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `FROM a LEFT JOIN b ON b.a_id = a.id` giữ mọi dòng của `a`; dòng nào không khớp thì các cột của `b` là `NULL`.
- "Khách chưa có đơn" = sau LEFT JOIN, cột khoá của `orders` là `NULL`.
- Hai bảng cùng có cột `name` hoặc `id` thì phải ghi rõ `bảng.cột` và đặt tên bằng `AS`.

</details>
