# nc-11 · Transactional outbox: ghi DB và gửi sự kiện mà không mất, không lệch

**Mục tiêu:** đảm bảo "đơn đã lưu" và "sự kiện order.created" luôn đi cùng nhau, kể cả khi message broker lỗi.

## Vì sao quan trọng khi đi làm

Tạo đơn xong cần báo cho hệ thống khác (gửi email, đồng bộ ERP, trừ điểm thưởng). Cách ngây thơ:

```js
db.insertOrder(order);          // 1. ghi DB
await broker.publish(event);    // 2. gửi message
```

Đây là **dual write**, và nó hỏng theo hai kiểu:

- Bước 1 xong, bước 2 lỗi (broker sập, process bị kill) → đơn có trong DB nhưng **không ai được báo**.
- Đảo thứ tự: gửi xong rồi ghi DB lỗi → hệ thống khác xử lý một đơn **không tồn tại**.

**Outbox pattern:** ghi sự kiện vào một bảng `outbox` **trong cùng transaction** với đơn hàng. Hoặc có cả hai,
hoặc không có gì. Một tiến trình riêng (**relay**) đọc bảng `outbox` và gửi đi, gửi xong thì đánh dấu.
Relay có thể gửi trùng (gửi xong nhưng chưa kịp đánh dấu thì chết) → phía nhận phải chống trùng bằng id sự kiện.
Đây là đảm bảo **at-least-once**.

## Schema (test tạo sẵn)

```sql
CREATE TABLE orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  total          INTEGER NOT NULL,
  created_at     TEXT NOT NULL
);
CREATE TABLE outbox (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  payload    TEXT NOT NULL,            -- JSON
  created_at TEXT NOT NULL,
  sent_at    TEXT,                     -- NULL = chưa gửi
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
```

Test có thể gắn thêm trigger để giả lập lỗi khi ghi `outbox`.

## Yêu cầu

### 1. `placeOrderWithOutbox(db, order, { now = () => new Date().toISOString() } = {})`

`order` dạng `{ customerEmail, items: [{ sku, price, quantity }] }`.

- `items` rỗng → throw `Error`, không ghi gì.
- Trong **một transaction**: tạo dòng `orders` (`total` = tổng `price × quantity`), rồi tạo dòng `outbox` với
  `event_type = 'order.created'`, `payload = JSON.stringify({ orderId, customerEmail, total })`, `created_at = now()`.
- Bất kỳ lỗi nào → rollback cả hai và throw lại lỗi đó.
- Trả `orderId`.

### 2. `createOutboxRelay(db, publish, { batchSize = 10, maxAttempts = 5, now } = {})`

Trả object `{ runOnce }`. `runOnce()` là hàm async, trả `{ sent, failed }`:

- Lấy tối đa `batchSize` sự kiện **chưa gửi** (`sent_at IS NULL`) và **chưa quá** `maxAttempts` lần thử, theo `id` tăng dần.
- Gửi **lần lượt**: `await publish({ id, type, payload })` (`payload` là object đã parse).
- Gửi được → ghi `sent_at = now()`.
- `publish` lỗi → tăng `attempts`, ghi `last_error` (message của lỗi), rồi **dừng batch** để giữ thứ tự sự kiện
  (không gửi sự kiện sau trước sự kiện trước). Lần `runOnce` sau sẽ thử lại từ sự kiện đó.
- Sự kiện đã thử `maxAttempts` lần thì bỏ qua (coi như dead-letter, cần người xem), để các sự kiện sau chạy tiếp.
- Nếu `runOnce` đang chạy mà bị gọi lần nữa → lần sau trả ngay `{ sent: 0, failed: 0 }`, không gửi gì
  (tránh hai lần gọi gửi trùng cùng sự kiện).

## Chạy

```bash
npm run check nc-11
```

## Tự kiểm tra sau khi đạt

1. Relay gửi xong sự kiện nhưng process chết trước khi ghi `sent_at`. Khởi động lại thì chuyện gì xảy ra?
   Phía nhận cần làm gì?
2. Vì sao dừng batch khi gặp lỗi, thay vì bỏ qua sự kiện lỗi và gửi tiếp các sự kiện sau?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Transaction: `db.exec('BEGIN')` / `COMMIT` / `ROLLBACK` như bài w6-02. `orderId` lấy từ `.run(...).lastInsertRowid`
(là số hoặc BigInt, đổi bằng `Number(...)`). Relay: một biến `running` trong closure để chặn gọi chồng.

</details>

## Đọc thêm

- microservices.io: *Transactional outbox*, *Idempotent consumer*.
- Debezium (Change Data Capture) đọc outbox từ log của PostgreSQL thay vì polling.
- Magento: `magento/module-message-queue` và bảng `queue_message`; Shopify webhook cũng là at-least-once.
