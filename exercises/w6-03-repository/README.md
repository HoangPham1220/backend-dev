# w6-03 · Repository: tầng truy cập dữ liệu

> BÀI TẬP LỚN tuần 5–6. Gộp mọi thứ đã học về SQL: CRUD, phân trang, prepared statement, transaction.

**Mục tiêu:** viết tầng data hoàn chỉnh cho product và order. Mọi SQL của ứng dụng nằm ở đây; tầng trên (API
tuần sau) chỉ gọi hàm, không viết SQL.

## Vì sao tách tầng này

- API endpoint chỉ biết `productRepo.list({ page: 2 })`, không cần biết bên dưới là SQLite hay PostgreSQL.
- Khi dự án lớn chuyển sang PostgreSQL, **chỉ tầng này thay đổi**.
- Test được tầng data riêng, không cần dựng server.

## So với PHP / Magento

Đây chính là `ProductRepositoryInterface` của Magento: `getById`, `save`, `delete`, `getList(SearchCriteria)`.
Khác ở chỗ Magento dùng resource model sinh SQL, còn ở đây bạn tự viết SQL.

Tên cột trong DB là `snake_case` (`category_id`); object trả ra cho JavaScript dùng `camelCase` (`categoryId`).
Việc chuyển đổi này là việc của repository.

## Dữ liệu mẫu

Test nạp `seed.sql` vào một DB SQLite mới trong bộ nhớ. Mở file đó để xem toàn bộ dữ liệu.

```
categories  (id, name)
customers   (id, name, email UNIQUE, city NULL được, created_at)
products    (id, sku UNIQUE, name, category_id → categories NULL được, price, stock, status 'active'|'disabled')
orders      (id, customer_id → customers, status 'pending'|'paid'|'shipped'|'cancelled', created_at 'YYYY-MM-DD HH:MM:SS')
order_items (id, order_id → orders, product_id → products, price = giá lúc đặt, quantity)
```
## Yêu cầu

Mọi object trả về là **object thường** (không phải row thô của `node:sqlite`), dùng camelCase.

### `createProductRepository(db)` → object gồm 5 hàm

Product có dạng: `{ id, sku, name, categoryId, price, stock, status }`.

| Hàm | Kết quả |
|---|---|
| `create({ sku, name, price, stock = 0, categoryId = null, status = 'active' })` | product vừa tạo. SKU trùng → throw `'SKU đã tồn tại: <sku>'` |
| `findBySku(sku)` | product hoặc `null` |
| `list({ q, page, perPage, sortBy, sortDir } = {})` | `{ items, total, page, perPage, totalPages }`, xem bên dưới |
| `update(sku, changes)` | product sau khi sửa, hoặc `null` nếu không có sku |
| `delete(sku)` | `true` nếu đã xoá, `false` nếu không có sku |

**`list`:**

- Mặc định: `q = ''`, `page = 1`, `perPage = 10`, `sortBy = 'id'`, `sortDir = 'asc'`.
- `q`: lọc tên chứa `q`. `total` là tổng số dòng khớp (không phải số dòng của trang).
- `totalPages = Math.ceil(total / perPage)`.
- `sortBy` chỉ nhận `id`, `name`, `price`, `stock`; khác → throw `'sortBy không hợp lệ: <giá trị>'`.
- `sortDir` chỉ nhận `'asc'`, `'desc'`; khác → throw `'sortDir không hợp lệ: <giá trị>'`.
- Luôn sắp thêm theo `id` tăng dần sau cột chính, để phân trang ổn định khi trùng giá trị.
- `page` là số nguyên `>= 1`, `perPage` là số nguyên từ 1 đến 100; sai → throw `RangeError`.

**`update`:** chỉ cho sửa `name`, `price`, `stock`, `status`. Key khác (ví dụ `sku`, `id`) → throw
`'Không cho phép cập nhật: <key>'` và **không sửa gì**. `changes` rỗng → trả product hiện tại.

**`delete`:** sản phẩm đang nằm trong đơn hàng (khoá ngoại chặn) → throw `'Sản phẩm đang có trong đơn hàng: <sku>'`.

### `createOrderRepository(db)` → object gồm 3 hàm

| Hàm | Kết quả |
|---|---|
| `getOrderWithItems(orderId)` | order đầy đủ (dạng bên dưới) hoặc `null` |
| `listByCustomer(customerId)` | `[{ id, status, createdAt, total }]`, đơn mới nhất trước |
| `placeOrder({ customerId, items })` | đơn vừa tạo, cùng dạng với `getOrderWithItems`. Luật y hệt bài w6-02 |

Order đầy đủ:

```js
{
  id: 6, customerId: 2, status: 'paid', createdAt: '2026-07-14 16:30:00', total: 930000,
  items: [
    { sku: 'AO-001', name: 'Áo thun basic trắng', price: 150000, quantity: 3, lineTotal: 450000 },
    // ... sắp theo thứ tự thêm vào đơn
  ],
}
```

## Khác biệt với PostgreSQL

- Placeholder là `$1, $2`; mọi hàm trở thành `async` vì `pg` trả Promise.
- Lỗi UNIQUE/khoá ngoại nhận biết bằng `error.code` (`'23505'`, `'23503'`) thay vì đọc message.
- Lấy id vừa tạo bằng `INSERT ... RETURNING id`.

## Chạy

```bash
npm run check w6-03
npm run watch w6-03
```

## Tự kiểm tra sau khi đạt

1. `sortBy` không dùng được dấu `?`, vậy whitelist bảo vệ bạn khỏi điều gì? Cho một input tấn công cụ thể.
2. Vì sao phân trang cần "sắp thêm theo id"? Hãy tạo ví dụ hai trang bị trùng hoặc sót sản phẩm nếu thiếu nó.
3. Chuyển repository này sang PostgreSQL thì phần nào của code gọi nó (API) phải đổi?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Viết một hàm `toProduct(row)` chuyển row DB sang object camelCase, dùng lại ở mọi chỗ.
- `list` cần 2 câu: một câu `COUNT(*)` để lấy `total`, một câu lấy dữ liệu trang có `LIMIT ? OFFSET ?`.
- `update`: kiểm tra toàn bộ key **trước**, rồi mới dựng `SET name = ?, price = ?` từ các key hợp lệ.
- Nhận biết lỗi UNIQUE/FOREIGN KEY bằng `error.message`, rồi throw lỗi mới dễ hiểu hơn.
- `placeOrder` có thể dùng lại gần như nguyên code w6-02, cuối cùng gọi `getOrderWithItems`.

</details>
