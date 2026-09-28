# w2-06 · Biến môi trường: đọc cấu hình ứng dụng

**Mục tiêu:** chuyển biến môi trường (luôn là chuỗi) thành object cấu hình đúng kiểu, có giá trị mặc định và báo lỗi sớm khi thiếu cấu hình bắt buộc.

## So với PHP / Magento

- Magento để cấu hình DB, cache... trong `app/etc/env.php`, một file PHP trả về array. Node thường đọc từ **biến môi trường**, qua `process.env`:

```bash
PORT=8080 DATABASE_URL=postgres://localhost/shop node server.js
```

```js
process.env.PORT;          // '8080' (chuỗi, không phải số)
process.env.KHONG_CO;      // undefined
```

- **Mọi giá trị trong `process.env` đều là chuỗi.** `process.env.DEBUG === true` luôn sai, vì giá trị là `'true'`.
- Khi dev ở máy, người ta hay để biến trong file `.env` và nạp vào (`node --env-file=.env server.js`).
  **Không commit `.env` lên git** vì nó chứa mật khẩu DB, API key. Chỉ commit file mẫu `.env.example` không có giá trị thật.

Vì sao hàm nhận `env` làm **tham số** thay vì đọc thẳng `process.env`? Để test dễ: test truyền object tự tạo, không phải sửa biến môi trường thật của máy. Khi chạy thật thì gọi `getConfig(process.env)`.

## Yêu cầu

Viết `getConfig(env)`, trả về object:

```js
{ port: 8080, databaseUrl: 'postgres://...', nodeEnv: 'production', debug: false }
```

Luật:

1. `port`: từ `env.PORT`, chuyển sang **số**. Không có `PORT` → `3000`.
   Không phải số nguyên từ 1 đến 65535 (`'abc'`, `'30.5'`, `'0'`, `'8080abc'`) → `throw new Error(...)`.
2. `databaseUrl`: từ `env.DATABASE_URL`, **bắt buộc**. Thiếu hoặc chuỗi rỗng → throw Error, message chứa `DATABASE_URL`.
3. `nodeEnv`: từ `env.NODE_ENV`, mặc định `'development'`.
4. `debug`: `true` nếu `env.DEBUG` là `'true'` hoặc `'1'`, còn lại `false`.
5. Object trả về phải bị **đóng băng** bằng `Object.freeze`, để code khác không lỡ tay sửa cấu hình lúc chạy.

```js
getConfig({ DATABASE_URL: 'postgres://localhost/shop' });
// { port: 3000, databaseUrl: 'postgres://localhost/shop', nodeEnv: 'development', debug: false }

getConfig({ PORT: 'abc', DATABASE_URL: 'x' }); // throw Error
getConfig({});                                // throw Error: ... DATABASE_URL ...
```

## Chạy

```bash
npm run check w2-06
npm run watch w2-06
```

## Tự kiểm tra sau khi đạt

Vì sao nên kiểm tra cấu hình và throw ngay lúc ứng dụng khởi động, thay vì để đến lúc có request đầu tiên mới phát hiện thiếu `DATABASE_URL`?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`Number('8080')` → `8080`, `Number('abc')` → `NaN`, `Number('8080abc')` → `NaN`.
Cẩn thận: `parseInt('8080abc')` lại trả về `8080`, nên dùng `Number`. Kiểm tra số nguyên bằng `Number.isInteger`.
Giá trị mặc định: `env.NODE_ENV ?? 'development'`.

</details>
