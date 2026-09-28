# nc-08 · Cursor pagination (keyset pagination)

**Mục tiêu:** phân trang bằng cursor thay cho `OFFSET`: ổn định khi có dữ liệu mới chèn vào, không trùng hay mất
dòng khi giá trị sắp xếp bị trùng, và nhanh ở trang sâu.

## Vì sao quan trọng khi đi làm

`LIMIT 20 OFFSET 100000` bắt database đọc rồi bỏ đi 100.000 dòng: trang càng sâu càng chậm. Tệ hơn, khi có đơn mới
chèn vào giữa hai lần gọi, mọi dòng bị đẩy lùi một vị trí và client thấy **trùng** một dòng ở trang sau. Đồng bộ
dữ liệu sang hệ thống khác (ERP, kho) mà bị trùng/mất dòng là lỗi nghiệp vụ thật.

Shopify Admin API (REST lẫn GraphQL) đã bỏ `page=N` và chuyển hẳn sang cursor (`page_info`, `after`) vì lý do này.

Keyset pagination: thay vì "bỏ qua N dòng", nói với database "lấy các dòng **đứng sau** dòng cuối cùng tôi đã thấy":

```sql
-- sắp theo price tăng dần; id để phân định khi trùng price
SELECT ... FROM products
WHERE (price > :price) OR (price = :price AND id > :id)
ORDER BY price ASC, id ASC
LIMIT 21;   -- lấy dư 1 dòng để biết còn trang sau không
```

## Yêu cầu

Bảng (test tự tạo và nạp ~200 dòng):

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  price INTEGER NOT NULL,
  created_at TEXT NOT NULL   -- ISO 8601, so sánh chuỗi được
);
```

### 1. `encodeCursor(data)` / `decodeCursor(cursor)`

- `encodeCursor`: `JSON.stringify` rồi mã hóa **base64url** (không có `+`, `/`, `=`, an toàn trên URL).
- `decodeCursor`: ngược lại. Chuỗi không giải mã được, hoặc không ra một object → throw `Error` có message chứa
  chữ `cursor`.

### 2. `listProducts(db, { limit = 20, after, sort = 'price' })`

- `sort`:
  - `'price'` → `price` tăng dần, trùng thì `id` tăng dần.
  - `'createdAt'` → mới nhất trước: `created_at` giảm dần, trùng thì `id` giảm dần.
  - Giá trị khác → `Error` (không bao giờ ghép `sort` thẳng vào SQL).
- `limit` là số nguyên 1–100, sai → `RangeError`.
- `after` (tùy chọn) là cursor lấy từ lần gọi trước. Cursor của kiểu `sort` khác, hoặc thiếu dữ liệu → `Error` chứa
  chữ `cursor`.
- Trả `{ items, nextCursor }`:
  - `items`: object thường `{ id, sku, price, createdAt }`.
  - `nextCursor`: cursor trỏ tới dòng cuối của trang, hoặc `null` nếu không còn dòng nào sau đó.
- Dùng prepared statement với tham số `?`.

## Chạy

```bash
npm run check nc-08
```

## Tự kiểm tra sau khi đạt

Vì sao phải có `id` trong điều kiện và `ORDER BY`? Cursor pagination không làm được gì mà offset làm được (gợi ý:
"nhảy tới trang 37")? Cần index nào để truy vấn này nhanh trên PostgreSQL?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Lưu trong cursor đủ để dựng lại điều kiện: `{ sort, value, id }` của dòng cuối trang. Giữ một object cấu hình cho
mỗi kiểu sort (tên cột, chiều so sánh `>` hay `<`, chiều `ASC`/`DESC`) thay vì if/else rải rác. Base64url:
`Buffer.from(text).toString('base64url')`.

</details>

## Đọc thêm

- Shopify: *Paginating results with GraphQL* / REST `page_info`.
- Bài *"We need tool support for keyset pagination"* (use-the-index-luke.com); cú pháp row value
  `(price, id) > (?, ?)` được PostgreSQL và SQLite hỗ trợ.
