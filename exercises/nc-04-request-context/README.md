# nc-04 · Request context và structured logging với AsyncLocalStorage

**Mục tiêu:** mỗi dòng log tự mang `requestId` của request đang xử lý, kể cả sau `await`, `setTimeout`,
`Promise.all`, mà không phải truyền `requestId` qua từng hàm.

## Vì sao quan trọng khi đi làm

Ở PHP-FPM mỗi request là một process riêng, biến toàn cục chỉ thuộc về một request. Ở Node **một process phục vụ
hàng nghìn request xen kẽ nhau**: gán `global.currentRequestId = ...` sẽ bị request khác ghi đè ngay sau `await`
đầu tiên. Khi có sự cố production, bạn cần lọc log theo một `requestId` để thấy toàn bộ hành trình của một đơn hàng.

`AsyncLocalStorage` (module `node:async_hooks`) giữ một "ngữ cảnh" đi theo chuỗi bất đồng bộ: code chạy bên trong
`storage.run(ctx, fn)`, kể cả các callback và Promise được tạo ra từ đó, đều đọc được `ctx`.

Log dạng JSON một dòng (*structured logging*) để công cụ như Loki, Elasticsearch, CloudWatch lọc theo trường.

## Yêu cầu

### 1. `runWithContext(ctx, fn)` và `getContext()`

- `runWithContext` chạy `fn()` trong ngữ cảnh `ctx`, trả về đúng giá trị `fn()` trả về (kể cả Promise).
- `getContext()` trả `ctx` hiện tại, hoặc `undefined` khi đang ở ngoài mọi ngữ cảnh.
- Lồng nhau: bên trong dùng ngữ cảnh mới, ra khỏi thì trở về ngữ cảnh cũ.

### 2. `createLogger(write, { now })`

Trả `{ info, warn, error }`, mỗi hàm nhận `(msg, fields = {})` và gọi `write(line)` **đúng một lần** với `line`
là một dòng JSON kết thúc bằng `\n`:

```json
{"time":"2026-10-01T00:00:00.000Z","level":"info","msg":"Tạo đơn","requestId":"r-1","orderId":42}
```

- `time` lấy từ `now()` (mặc định `new Date().toISOString()`).
- `requestId` lấy từ `getContext()?.requestId`; không có thì **không** có key này.
- `fields` được trải vào object log, nhưng không được ghi đè `time`, `level`, `msg`.
- Field nào là `Error` → ghi thành `{ name, message }` (vì `JSON.stringify(new Error('x'))` ra `{}`).

### 3. `contextMiddleware({ generateId })`

Trả middleware `(req, res, next)` cho `node:http`:

- `requestId` = header `x-request-id` nếu client gửi, không thì `generateId()` (mặc định `crypto.randomUUID`).
- Đặt header response `x-request-id`.
- Gọi `next()` bên trong ngữ cảnh `{ requestId, method, url }`, trả về kết quả của `next()`.

## Chạy

```bash
npm run check nc-04
```

## Tự kiểm tra sau khi đạt

Vì sao gán `requestId` vào biến module-level thì chạy đúng khi test từng request một nhưng sai khi có tải thật?
Chi phí hiệu năng của `AsyncLocalStorage` đáng lo không?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Tạo **một** `new AsyncLocalStorage()` ở cấp module. `runWithContext` chỉ là `storage.run(ctx, fn)`,
`getContext` là `storage.getStore()`. Khi dựng object log, đặt `...fields` **trước** rồi mới gán `time`, `level`,
`msg` để chúng không bị ghi đè.

</details>

## Đọc thêm

- `pino` (logger JSON nhanh cho Node), `pino-http`; OpenTelemetry dùng cùng cơ chế để truyền trace.
- Tài liệu Node: *Asynchronous context tracking*.
