# w8-04 · Middleware xác thực, phân quyền và giới hạn tần suất

**Mục tiêu:** viết middleware theo kiểu `(req, res, next)`, phân biệt rõ 401, 403 và 429.

## Middleware là gì

Middleware là hàm `(req, res, next)` chạy trước handler chính. Nó hoặc **trả lời luôn** (chặn request), hoặc gọi
`next()` để chuyển sang bước tiếp theo. Express dùng đúng mô hình này, bài này viết không cần Express.

```js
function logger(req, res, next) {
  console.log(req.method, req.url);
  next(); // cho đi tiếp
}
```

## So với PHP

Magento có plugin `around`/`before` và observer; Laravel có middleware với `$next($request)`. Ý tưởng giống nhau:
một chuỗi bước, bước nào cũng có thể dừng chuỗi lại.

Phân biệt status:

| Status | Ý nghĩa | Ví dụ |
|---|---|---|
| `401 Unauthorized` | Chưa xác thực: không biết bạn là ai | thiếu token, token sai |
| `403 Forbidden` | Biết bạn là ai nhưng không có quyền | `customer` gọi API của `admin` |
| `429 Too Many Requests` | Gọi quá nhiều | vượt giới hạn tần suất |

## Yêu cầu

`res` là response kiểu `node:http`: đặt `res.statusCode`, dùng `res.setHeader(name, value)`, kết thúc bằng `res.end(body)`.
Khi chặn request thì **không** gọi `next()`.

### 1. `authenticate(verifyToken)`

Trả về middleware:

- Đọc header `authorization`, dạng `Bearer <token>`.
- Thiếu header, không bắt đầu bằng `Bearer `, hoặc `verifyToken(token)` throw → `401`.
- Hợp lệ → gán `req.user = verifyToken(token)` rồi `next()`.

### 2. `authorize(...roles)`

Trả về middleware:

- Chưa có `req.user` → `401`.
- `req.user.role` không nằm trong `roles` → `403`.
- Còn lại → `next()`.

```js
authorize('admin', 'staff'); // chỉ admin hoặc staff đi tiếp
```

### 3. `rateLimit({ windowMs, max, now = Date.now, keyOf = (req) => req.ip })`

Trả về middleware giới hạn **cửa sổ cố định** (fixed window):

- Thời gian chia thành các cửa sổ dài `windowMs`: cửa sổ bắt đầu tại `Math.floor(now() / windowMs) * windowMs`.
- Mỗi key (mặc định là IP) được tối đa `max` request trong một cửa sổ. Request thứ `max + 1` → `429`.
- Khi trả 429, đặt header `Retry-After` = số **giây** còn lại tới cửa sổ tiếp theo, làm tròn lên (`Math.ceil`).
- Sang cửa sổ mới thì đếm lại từ đầu. Các key đếm riêng nhau.
- `now` là hàm trả về mili giây, test truyền đồng hồ giả.

## Khi đi làm

Bài này tự cài đặt để **hiểu**. Đi làm dùng thư viện đã kiểm chứng: `passport` hoặc middleware của `jose` cho xác thực,
`express-rate-limit` (lưu đếm trong Redis khi chạy nhiều server), `helmet` cho các header bảo mật.

## Chạy

```bash
npm run check w8-04
npm run watch w8-04
```

## Tự kiểm tra sau khi đạt

1. Vì sao nên đặt `authenticate` trước `authorize` trong chuỗi middleware?
2. Fixed window có điểm yếu: một người có thể gửi gần `2 × max` request trong thời gian rất ngắn. Khi nào, và cách nào khắc phục?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Viết hàm nhỏ `deny(res, status, message)` dùng chung.
- `rateLimit` cần một `Map` nằm trong closure: key → `{ windowStart, count }`.

</details>
