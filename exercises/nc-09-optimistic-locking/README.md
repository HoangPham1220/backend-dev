# nc-09 · Optimistic locking: chống "ghi đè mất dữ liệu"

**Mục tiêu:** phát hiện xung đột khi hai người cùng sửa một bản ghi, bằng cột `version`, không cần khoá dòng.

## Vì sao quan trọng khi đi làm

Hai admin cùng mở trang sửa sản phẩm `AO-001` (giá 100000). Admin A tăng giá lên 120000 và bấm Lưu.
Admin B vẫn đang nhìn form cũ, sửa mô tả rồi bấm Lưu → form của B gửi kèm giá **cũ** 100000 → giá A vừa sửa biến mất.
Không có lỗi nào được báo. Đây gọi là **lost update**.

Có hai cách chống:

| | Optimistic (bài này) | Pessimistic |
|---|---|---|
| Cách làm | Mỗi dòng có `version`. Ghi kèm điều kiện `WHERE version = <version lúc đọc>`. Không khớp → báo xung đột | Khoá dòng khi đọc: `SELECT ... FOR UPDATE` (PostgreSQL/MySQL), người khác phải chờ |
| Hợp khi | Xung đột hiếm, thời gian "đọc → sửa → ghi" dài (form admin, API client giữ dữ liệu lâu) | Xung đột thường xuyên, transaction ngắn (trừ tồn kho khi checkout) |
| Giá phải trả | Client phải xử lý lỗi xung đột (đọc lại, thử lại hoặc hỏi người dùng) | Chờ khoá, có thể deadlock, không giữ khoá qua nhiều request HTTP được |

Trong HTTP, optimistic locking thường đi với header **`ETag` / `If-Match`**: server trả `ETag: "3"` (version),
client gửi lại `If-Match: "3"` khi sửa, lệch thì server trả **412 Precondition Failed** (hoặc 409).

## Schema (test tạo sẵn)

```sql
CREATE TABLE products (
  id      INTEGER PRIMARY KEY,
  sku     TEXT NOT NULL UNIQUE,
  price   INTEGER NOT NULL CHECK (price >= 0),
  version INTEGER NOT NULL DEFAULT 1
);
```

## Yêu cầu

`ConflictError` đã viết sẵn trong `exercise.js`: `throw new ConflictError(message, currentVersion)`.

### 1. `getProduct(db, id)`

Trả object thường `{ id, sku, price, version }`, không có thì `null`.

### 2. `updateProductPrice(db, { id, price, expectedVersion })`

- `price` không phải số nguyên `>= 0` → throw `RangeError`, không đụng DB.
- Cập nhật **bằng một câu UPDATE duy nhất** có điều kiện `version = expectedVersion`, đồng thời tăng `version` lên 1.
- Không dòng nào bị đổi thì phân biệt hai trường hợp:
  - Sản phẩm không tồn tại → throw `Error` (không phải `ConflictError`), message chứa id.
  - Có tồn tại nhưng version lệch → throw `ConflictError` với `currentVersion` là version hiện tại trong DB.
- Thành công → trả sản phẩm sau khi cập nhật (như `getProduct`).

### 3. `withRetryOnConflict(fn, { retries = 3 } = {})`

Hàm **async**. Gọi `await fn(attempt)` (`attempt` bắt đầu từ 1):

- `fn` thành công → trả kết quả.
- `fn` throw `ConflictError` → gọi lại, tối đa `retries` lần thử lại (tức tổng cộng `1 + retries` lần).
  Hết lượt → throw `ConflictError` cuối cùng.
- `fn` throw lỗi khác → throw ngay, không thử lại.

`fn` phải tự **đọc lại** dữ liệu mới mỗi lần được gọi, nên thử lại mới có ý nghĩa:

```js
await withRetryOnConflict(() => {
  const product = getProduct(db, 1);                       // đọc bản mới nhất
  return updateProductPrice(db, {
    id: 1,
    price: Math.round(product.price * 1.1),               // tính trên dữ liệu vừa đọc
    expectedVersion: product.version,
  });
});
```

## Chạy

```bash
npm run check nc-09
```

## Tự kiểm tra sau khi đạt

1. Vì sao cách "SELECT version, so sánh trong JS, rồi mới UPDATE" vẫn có khe hở, còn một câu `UPDATE ... WHERE version = ?` thì không?
2. Khi nào **không nên** tự động thử lại, mà phải trả lỗi cho người dùng quyết định? (Gợi ý: admin B ở ví dụ đầu bài.)

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`db.prepare(...).run(...)` trả `{ changes }`. `changes === 0` thì chạy thêm một câu SELECT để biết lý do là
"không tồn tại" hay "version lệch". Với `withRetryOnConflict`, dùng vòng `for` và `instanceof ConflictError`.

</details>

## Đọc thêm

- HTTP conditional requests: `ETag`, `If-Match`, `412 Precondition Failed` (MDN).
- PostgreSQL: `SELECT ... FOR UPDATE`, isolation level `REPEATABLE READ` / `SERIALIZABLE`.
- ORM: TypeORM `@VersionColumn`, Sequelize `version: true`, Prisma (tự làm bằng `where: { id, version }`).
