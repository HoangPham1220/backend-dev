# w4-05 · Xử lý lỗi tập trung

**Mục tiêu:** tạo các class lỗi HTTP riêng và một `errorHandler` duy nhất, trả JSON lỗi thống nhất,
và **không bao giờ lộ chi tiết nội bộ** cho client.

## So với PHP

- Magento: `NoSuchEntityException`, `LocalizedException`..., và ở production thì trang lỗi chỉ ghi "There has been
  an error processing your request" kèm mã report, chi tiết nằm trong `var/report/`. Bài này làm đúng tinh thần đó.
- `class NotFoundError extends HttpError` giống `extends` trong PHP. Nhớ gọi `super(...)` trong constructor
  trước khi dùng `this` (PHP là `parent::__construct(...)`).

## Yêu cầu

### 1. Các class lỗi

- `HttpError(status, message, details = null)` kế thừa `Error`, có các thuộc tính:
  - `status`: số status HTTP.
  - `message`.
  - `details`: mặc định `null`.
  - `code`: lấy từ `ERROR_CODES[status]` (đã có sẵn trong file khung), không có thì `'HTTP_ERROR'`.
  - `name`: `'HttpError'`.
- `NotFoundError(message = 'Không tìm thấy')` kế thừa `HttpError`, status 404, `name = 'NotFoundError'`.
- `ValidationError(details)` kế thừa `HttpError`, status 422, message `'Dữ liệu không hợp lệ'`,
  `name = 'ValidationError'`. `details` là object `{ tênField: 'lý do' }`.

### 2. `errorHandler(err, req, res)`

Ghi response JSON với header `Content-Type: application/json`, body luôn có dạng:

```json
{ "error": { "code": "NOT_FOUND", "message": "Không tìm thấy sản phẩm CAP", "details": null } }
```

- `err` là `HttpError` (kể cả class con) → dùng `status`, `code`, `message`, `details` của nó.
- `err` là lỗi thường nhưng có `err.status` là số từ 400 đến 499 (ví dụ lỗi 400/413 từ `readJsonBody` ở w4-02)
  → dùng status đó, `code = ERROR_CODES[status] ?? 'HTTP_ERROR'`, `message = err.message`, `details = null`.
- Mọi trường hợp khác (lỗi không lường trước, kể cả `throw 'chuỗi'`) → status **500**,
  `code: 'INTERNAL_ERROR'`, `message: 'Internal Server Error'`, `details: null`. **Không** đưa `err.message`
  hay stack ra response. Ghi lỗi gốc ra log bằng `console.error(err)` để dev đọc.

```js
http.createServer((req, res) => {
  try {
    throw new NotFoundError('Không tìm thấy sản phẩm CAP');
  } catch (err) {
    errorHandler(err, req, res);
  }
});
```

## Chạy

```bash
npm run check w4-05
npm run watch w4-05
```

## Trong Express

```js
app.get('/products/:sku', (req, res) => {
  const product = find(req.params.sku);
  if (!product) throw new NotFoundError(`Không tìm thấy sản phẩm ${req.params.sku}`);
  res.json(product);
});
app.use((err, req, res, next) => errorHandler(err, req, res)); // đặt CUỐI cùng
```

## Tự kiểm tra sau khi đạt

Vì sao lỗi 500 không được trả `err.message` về client? Nêu một ví dụ message lỗi từ database có thể làm lộ thông tin.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Trong constructor class con: `super(404, message); this.name = 'NotFoundError';`. Trong `errorHandler`, kiểm tra
theo thứ tự `err instanceof HttpError` → `typeof err?.status === 'number' && ...` → còn lại. Dùng `?.` vì `err`
có thể không phải object.

</details>
