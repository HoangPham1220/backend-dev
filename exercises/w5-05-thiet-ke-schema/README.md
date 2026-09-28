# w5-05 · Thiết kế schema và ràng buộc

**Mục tiêu:** viết `CREATE TABLE` cho products, orders, order_items, để **database tự chặn dữ liệu sai**
bằng khoá chính, khoá ngoại, `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`.

## So với PHP / Magento

Magento khai báo bảng trong `db_schema.xml` (khoá ngoại `<constraint xsi:type="foreign">`, unique...) rồi
`setup:upgrade` sinh ra SQL. Ở đây bạn viết thẳng SQL đó.

Vì sao cần ràng buộc khi code Node đã validate rồi? Vì dữ liệu còn vào bằng nhiều đường khác: script import,
người sửa tay trong DB, bug ở một endpoint khác. Ràng buộc là lớp bảo vệ cuối cùng.

## Yêu cầu

Viết toàn bộ câu lệnh vào chuỗi `schemaSql`. Bảng `customers (id, name, email)` **test đã tạo sẵn** trước khi
chạy schema của bạn, và test bật `PRAGMA foreign_keys = ON`.

### `products`

| Cột | Luật |
|---|---|
| `id` | `INTEGER PRIMARY KEY` (tự tăng) |
| `sku` | chuỗi, bắt buộc, **không trùng** |
| `name` | chuỗi, bắt buộc |
| `price` | số nguyên, bắt buộc, `>= 0` |
| `stock` | số nguyên, bắt buộc, `>= 0`, mặc định `0` |

### `orders`

| Cột | Luật |
|---|---|
| `id` | `INTEGER PRIMARY KEY` |
| `customer_id` | bắt buộc, khoá ngoại tới `customers(id)` |
| `status` | bắt buộc, mặc định `'pending'`, chỉ nhận `'pending'`, `'paid'`, `'shipped'`, `'cancelled'` |
| `created_at` | bắt buộc, mặc định là thời điểm hiện tại (`CURRENT_TIMESTAMP`) |

### `order_items`

| Cột | Luật |
|---|---|
| `id` | `INTEGER PRIMARY KEY` |
| `order_id` | bắt buộc, khoá ngoại tới `orders(id)` |
| `product_id` | bắt buộc, khoá ngoại tới `products(id)` |
| `price` | số nguyên, bắt buộc, `>= 0` (giá tại thời điểm đặt) |
| `quantity` | số nguyên, bắt buộc, `> 0` |
| | một sản phẩm chỉ xuất hiện **một lần** trong một đơn: `UNIQUE (order_id, product_id)` |

## Khác biệt với PostgreSQL / MySQL

| SQLite (bài này) | PostgreSQL (dự án thật) |
|---|---|
| `id INTEGER PRIMARY KEY` tự tăng | `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (hoặc `SERIAL`) |
| `created_at TEXT DEFAULT CURRENT_TIMESTAMP` | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` |
| Khoá ngoại **tắt mặc định**, phải `PRAGMA foreign_keys = ON` | Luôn bật |
| Kiểu dữ liệu lỏng: cột `INTEGER` vẫn nhận chuỗi `'abc'` | Kiểu chặt, báo lỗi ngay |

Tiền để số nguyên VND là ổn. Với tiền có phần lẻ (USD), PostgreSQL dùng `NUMERIC(12,2)`, **không** dùng `FLOAT`.

## Chạy

```bash
npm run check w5-05
npm run watch w5-05
```

## Tự kiểm tra sau khi đạt

1. Vì sao `order_items` lưu `price` riêng thay vì luôn lấy `products.price`?
2. Nếu xoá một product đang nằm trong `order_items` thì chuyện gì xảy ra? Muốn "ẩn" sản phẩm cũ thì nên làm gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Ràng buộc trên một cột viết ngay sau kiểu: `sku TEXT NOT NULL UNIQUE`.
- `CHECK (price >= 0)`, `CHECK (status IN ('pending', 'paid'))`.
- Khoá ngoại: `customer_id INTEGER NOT NULL REFERENCES customers(id)`.
- Ràng buộc nhiều cột viết thành một dòng riêng ở cuối bảng: `UNIQUE (order_id, product_id)`.
- Tạo bảng cha trước bảng con. Các câu `CREATE TABLE` cách nhau bằng dấu `;`.

</details>
