# w8-03 · Nhận webhook kiểu Shopify: xác thực HMAC và chống xử lý trùng

**Mục tiêu:** nhận webhook an toàn: chỉ tin request có chữ ký đúng, và cùng một webhook gửi lại nhiều lần chỉ được xử lý một lần.

## Bối cảnh

Khi có đơn mới, Shopify gửi `POST` tới server của bạn, kèm các header:

- `x-shopify-hmac-sha256`: HMAC-SHA256 của **raw body** (nguyên văn byte nhận được) với secret của app, mã hóa **base64**.
- `x-shopify-webhook-id`: id duy nhất của lần gửi. Shopify **gửi lại** nếu server không trả 200 kịp, nên cùng một
  id có thể đến nhiều lần.

Hai lỗi kinh điển khi làm webhook:

1. Parse JSON rồi `JSON.stringify` lại để tính HMAC. Chuỗi mới có thể khác byte gốc (khoảng trắng, thứ tự, escape
   unicode), chữ ký sẽ không khớp. **Phải tính trên raw body.**
2. Không chống trùng: Shopify gửi lại, hệ thống tạo 2 đơn, trừ kho 2 lần.

## So với PHP

Trong PHP bạn đọc raw body bằng `file_get_contents('php://input')` và so sánh bằng `hash_equals()`.
Trong Node với `node:http`, body đến theo từng mảnh (chunk) qua stream `req`, phải tự gom lại thành Buffer.

## Yêu cầu

### 1. `verifyWebhook(rawBody, hmacHeader, secret)`

- `rawBody` là `Buffer` hoặc chuỗi.
- Tính `createHmac('sha256', secret).update(rawBody).digest('base64')`, so với `hmacHeader` bằng `timingSafeEqual`.
- Header thiếu, không phải chuỗi, hoặc độ dài khác → `false` (không throw).

### 2. `readRawBody(req)` (async)

Gom các chunk của `req` thành một `Buffer` và trả về.

### 3. `createWebhookHandler({ secret, store, onOrder })`

Trả về hàm `async (req, res)` dùng được với `http.createServer(handler)`.

- `store` có `has(id)` và `add(id)` (một `Set` cũng dùng được). Nó ghi nhớ các webhook id **đã xử lý xong**.
- `onOrder(order)` là hàm (có thể async) xử lý đơn.

Kiểm tra theo đúng thứ tự:

| Thứ tự | Trường hợp | Status | Ghi chú |
|---|---|---|---|
| 1 | Chữ ký sai hoặc thiếu | `401` | không gọi `onOrder` |
| 2 | Thiếu header `x-shopify-webhook-id` | `400` | |
| 3 | Id đã có trong `store` | `200` | **không** gọi `onOrder` lần hai |
| 4 | Body không phải JSON hợp lệ | `400` | |
| 5 | `onOrder` throw | `500` | **không** thêm id vào `store`, để lần gửi lại được xử lý |
| 6 | Thành công | `200` | gọi `onOrder(order)` rồi mới `store.add(id)` |

Body phản hồi tùy bạn (test chỉ kiểm tra status). Nhớ luôn kết thúc bằng `res.end(...)`.

## Khi đi làm

Bài này tự cài đặt để **hiểu**. Đi làm dùng thư viện chính thức (`@shopify/shopify-api` có sẵn hàm validate webhook)
hoặc middleware đã kiểm chứng. `store` thật sẽ là bảng database có unique index trên webhook id (hoặc Redis),
vì `Set` trong bộ nhớ mất khi restart và không chia sẻ giữa nhiều server.

## Chạy

```bash
npm run check w8-03
npm run watch w8-03
```

## Tự kiểm tra sau khi đạt

1. Vì sao chỉ `store.add(id)` **sau khi** `onOrder` thành công? Nếu thêm trước thì chuyện gì xảy ra khi `onOrder` lỗi?
2. Có hai request cùng id đến **gần như cùng lúc**. Code hiện tại có xử lý trùng không? Database giải quyết chuyện này thế nào?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `req` là async iterable: `for await (const chunk of req) chunks.push(chunk);` rồi `Buffer.concat(chunks)`.
- Tên header trong `req.headers` luôn là chữ thường.
- Mỗi trường hợp: `res.statusCode = 401; res.end('...'); return;`

</details>
