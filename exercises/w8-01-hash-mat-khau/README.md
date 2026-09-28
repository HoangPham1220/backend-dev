# w8-01 · Hash mật khẩu với scrypt

**Mục tiêu:** hiểu vì sao mật khẩu phải hash kèm salt, và vì sao so sánh hash phải dùng so sánh thời gian cố định.

## So với PHP

| PHP | Node.js (bài này) |
|---|---|
| `password_hash($plain, PASSWORD_DEFAULT)` | `hashPassword(plain)` tự viết bằng `crypto.scryptSync` |
| `password_verify($plain, $hash)` | `verifyPassword(plain, stored)` với `crypto.timingSafeEqual` |

PHP gói sẵn salt và thuật toán vào chuỗi hash (`$2y$10$...`). Bài này làm y hệt, tự tay: gói tên thuật toán,
salt và hash vào một chuỗi để lưu vào cột `password_hash` trong database.

```js
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
```

## Yêu cầu

### 1. `hashPassword(plain)`

- Tạo salt ngẫu nhiên 16 byte (`randomBytes(16)`).
- Tính hash bằng `scryptSync(plain, salt, 64)` (64 byte).
- Trả về chuỗi dạng `scrypt$<salt hex>$<hash hex>`.
- `plain` không phải chuỗi hoặc là chuỗi rỗng → `throw new TypeError(...)`.

```js
hashPassword('matkhau123');
// 'scrypt$9f1c...(32 ký tự hex)$4ab0...(128 ký tự hex)'
```

Gọi hai lần với cùng mật khẩu phải ra **hai chuỗi khác nhau** (vì salt khác nhau).

### 2. `verifyPassword(plain, stored)`

- Tách `stored` thành 3 phần theo dấu `$`, lấy salt, tính lại hash của `plain`, so sánh bằng `timingSafeEqual`.
- Đúng mật khẩu → `true`, sai → `false`.
- `stored` hỏng (sai định dạng, sai tên thuật toán, không phải hex, độ dài hash sai, không phải chuỗi) → `false`,
  **không được throw**. Lý do: dữ liệu trong database có thể bẩn, không nên làm sập request đăng nhập.

## Khi đi làm

Bài này tự cài đặt để **hiểu** cơ chế. Đi làm thì dùng thư viện đã được kiểm chứng: `bcrypt`, `argon2`
(khuyến nghị hiện nay), hoặc tối thiểu là tham số scrypt đã được review. Không tự sáng tạo thuật toán bảo mật.

## Chạy

```bash
npm run check w8-01
npm run watch w8-01
```

## Tự kiểm tra sau khi đạt

1. Nếu không có salt, hai người dùng cùng mật khẩu `123456` sẽ có hash thế nào? Kẻ tấn công lợi dụng điều đó ra sao?
2. Vì sao so sánh bằng `===` giữa hai chuỗi hash lại có thể lộ thông tin (timing attack)?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `Buffer.from(hex, 'hex')` đổi chuỗi hex về Buffer; `buffer.toString('hex')` làm ngược lại.
- `timingSafeEqual(a, b)` **throw** nếu hai Buffer khác độ dài, nên kiểm tra độ dài trước.
- Bọc phần xử lý `stored` trong `try/catch` để mọi dữ liệu hỏng đều trả `false`.

</details>
