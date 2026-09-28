# w8-02 · Tự cài đặt JWT (HS256)

**Mục tiêu:** hiểu JWT gồm những gì, chữ ký bảo vệ điều gì, và vì sao phải kiểm tra `alg` trước khi tin token.

## JWT là gì

Một JWT là 3 phần nối bằng dấu chấm: `header.payload.signature`, mỗi phần mã hóa **base64url**.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOjEsInJvbGUiOiJhZG1pbiJ9 . <chữ ký>
        header (JSON)                          payload (JSON)
```

- `header` = `{"alg":"HS256","typ":"JWT"}`.
- `payload` = dữ liệu (ví dụ `sub` là id người dùng, `role`), cộng `iat` (thời điểm tạo) và `exp` (hết hạn), tính bằng **giây**.
- `signature` = HMAC-SHA256 của chuỗi `header.payload` với `secret`, mã hóa base64url.

Payload **không được mã hóa**, ai cũng đọc được. Chữ ký chỉ đảm bảo **không ai sửa được** nếu không có secret.

## So với PHP

Magento lưu session phía server (bảng session / Redis), client chỉ giữ cookie id. JWT thì ngược lại: server không
lưu gì, mọi thông tin nằm trong token, server chỉ cần kiểm tra chữ ký. Đổi lại, không thu hồi token trước hạn được
nếu không có thêm cơ chế riêng.

## Yêu cầu

File khung đã có sẵn `JwtError` (lỗi có thuộc tính `code`). Dùng nó để throw.

### 1. `sign(payload, secret, { expiresInSec = 3600, now } = {})`

- `now` là thời điểm hiện tại tính bằng giây; mặc định `Math.floor(Date.now() / 1000)`.
  Test truyền `now` cố định để kết quả xác định.
- Header đúng thứ tự khóa: `{"alg":"HS256","typ":"JWT"}`.
- Payload = `{ ...payload, iat: now, exp: now + expiresInSec }` (đúng thứ tự này).
- Trả về chuỗi token.

```js
sign({ sub: 1, role: 'admin' }, 'bi-mat', { now: 1700000000, expiresInSec: 60 });
// payload bên trong: {"sub":1,"role":"admin","iat":1700000000,"exp":1700000060}
```

### 2. `verify(token, secret, { now } = {})`

Trả về payload (object) nếu hợp lệ. Nếu không, throw `JwtError` với `code` theo **đúng thứ tự kiểm tra** sau:

| Thứ tự | Trường hợp | `code` |
|---|---|---|
| 1 | Không phải chuỗi, không đủ 3 phần, header/payload không phải JSON hợp lệ | `'MALFORMED'` |
| 2 | `header.alg` khác `'HS256'` (kể cả `'none'`) | `'UNSUPPORTED_ALG'` |
| 3 | Chữ ký sai (so sánh bằng `timingSafeEqual`) | `'BAD_SIGNATURE'` |
| 4 | `now >= payload.exp` | `'EXPIRED'` |

## Khi đi làm

Bài này tự cài đặt để **hiểu**. Đi làm dùng thư viện đã kiểm chứng như `jose` hoặc `jsonwebtoken`, và luôn chỉ định
rõ thuật toán được chấp nhận (ví dụ `algorithms: ['HS256']`). Nhiều lỗ hổng thật đến từ việc tin `alg` trong header.

## Chạy

```bash
npm run check w8-02
npm run watch w8-02
```

## Tự kiểm tra sau khi đạt

1. Kẻ tấn công sửa `"role":"user"` thành `"role":"admin"` trong payload rồi gửi lên. Bước nào chặn được, vì sao?
2. Nếu server tin `alg` trong header và chấp nhận `"none"`, kẻ tấn công làm được gì?
3. Có nên để mật khẩu hay số điện thoại trong payload không?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `Buffer.from(JSON.stringify(obj)).toString('base64url')` để mã hóa; `Buffer.from(part, 'base64url').toString()` để giải mã.
- `createHmac('sha256', secret).update(data).digest('base64url')` để ký.
- Bọc bước tách và `JSON.parse` trong `try/catch`, lỗi thì throw `new JwtError('MALFORMED', ...)`.
- `timingSafeEqual` cần hai Buffer cùng độ dài.

</details>
