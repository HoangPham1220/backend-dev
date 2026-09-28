# nc-10 · Idempotency key: bấm "Thanh toán" hai lần vẫn chỉ tạo một đơn

**Mục tiêu:** làm cho một thao tác ghi (tạo đơn, trừ tiền) an toàn khi client gửi lại cùng một request.

## Vì sao quan trọng khi đi làm

Mạng chập chờn: client gửi `POST /orders`, server tạo đơn xong nhưng response bị mất. Client (hoặc người dùng
sốt ruột) gửi lại → **hai đơn, trừ tiền hai lần**. `GET`, `PUT`, `DELETE` vốn idempotent, nhưng `POST` thì không.

Cách chuẩn (Stripe, Shopify, PayPal đều dùng): client sinh một **Idempotency-Key** (UUID) cho mỗi thao tác và gửi
kèm header. Server lưu key cùng response lần đầu. Request sau có cùng key → trả lại **đúng response cũ**, không
chạy lại thao tác.

Các trường hợp khó mà bài này bắt bạn xử lý:

| Tình huống | Xử lý |
|---|---|
| Cùng key, cùng nội dung request | Trả response đã lưu, **không** chạy lại |
| Cùng key nhưng **nội dung khác** (client dùng lại key sai cách) | Lỗi **422** |
| Cùng key, request đầu **đang chạy dở** | Lỗi **409** (client thử lại sau) |
| Lần đầu chạy **thất bại** | Không lưu gì, client được thử lại với cùng key |
| Key đã quá hạn lưu (TTL) | Coi như key mới |

## Yêu cầu

`IdempotencyError` đã viết sẵn: `throw new IdempotencyError(409, 'message')`.

### 1. `createIdempotencyStore(db, { ttlMs = 86_400_000, now = () => Date.now() } = {})`

Tự tạo bảng của bạn (`CREATE TABLE IF NOT EXISTS ...`) trong `db` và trả về một object store. Thiết kế bảng và
các method của store là việc của bạn, chỉ bắt buộc:

- Dữ liệu phải nằm trong **DB**, không phải biến trong bộ nhớ: tạo store mới trên cùng `db` vẫn thấy key cũ
  (giống server khởi động lại, hoặc chạy nhiều instance).
- Có method `purgeExpired()` xoá các key đã hết hạn, trả số dòng đã xoá.
- Một key hết hạn khi `now() - thời điểm tạo >= ttlMs`.

### 2. `handleIdempotent(store, key, requestHash, fn)` (async)

Trả `{ response, replayed }`:

- `key` rỗng / `undefined` → không dùng idempotency: `await fn()` mỗi lần, `replayed: false`.
- Key chưa có (hoặc đã hết hạn) → ghi nhận "đang xử lý", `await fn()`, lưu response, trả `replayed: false`.
- Key có, **cùng** `requestHash`, đã xong → trả response đã lưu (bản sao, không phải cùng object), `replayed: true`.
- Key có, **khác** `requestHash` → `IdempotencyError` status **422**, không gọi `fn`.
- Key có, request đầu **chưa xong** → `IdempotencyError` status **409**, không gọi `fn`.
- `fn` throw → xoá trạng thái "đang xử lý" để lần sau chạy lại được, rồi throw tiếp đúng lỗi đó.

`response` luôn là dữ liệu JSON được (lưu bằng `JSON.stringify`).

## Chạy

```bash
npm run check nc-10
```

## Tự kiểm tra sau khi đạt

1. Vì sao cần `requestHash`? Chuyện gì xảy ra nếu bỏ qua và chỉ so key?
2. Hai request cùng key đến **đồng thời** trên hai server khác nhau: điều gì trong thiết kế bảng của bạn đảm bảo
   chỉ một request được chạy? (Gợi ý: `PRIMARY KEY` + `INSERT`, không phải `SELECT` rồi mới `INSERT`.)

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Bảng cần ít nhất: `key` (PRIMARY KEY), `request_hash`, `status` ('in_progress' | 'done'), `response` (TEXT, JSON),
`created_at`. Chèn dòng "in_progress" **trước** khi `await fn()`: request thứ hai đến trong lúc chờ sẽ thấy dòng đó.
Key hết hạn: xoá dòng cũ rồi coi như key mới.

</details>

## Đọc thêm

- Stripe API docs: *Idempotent requests*. IETF draft: *The Idempotency-Key HTTP Header Field*.
- Webhook Shopify dùng `X-Shopify-Webhook-Id` cho cùng mục đích ở chiều ngược lại (bài w8-03).
