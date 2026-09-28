# nc-15 · Giữ hàng có thời hạn khi checkout

**Mục tiêu:** giữ hàng cho khách trong lúc thanh toán, tự nhả khi quá hạn, và không bao giờ bán vượt tồn.

## Vì sao quan trọng khi đi làm

Flash sale: còn **1** chiếc áo, 2 khách cùng vào checkout. Nếu chỉ trừ kho lúc thanh toán xong, cả hai đều thấy
"còn hàng", nhập thông tin thẻ 3 phút, rồi một người nhận lỗi "hết hàng" ở bước cuối. Trải nghiệm tệ.

Cách phổ biến: khi khách **bắt đầu checkout**, tạo một **reservation** giữ hàng trong N phút (Shopify giữ hàng theo
checkout, vé máy bay/concert giữ chỗ 10–15 phút). Khách thanh toán xong → **confirm** (trừ tồn thật).
Bỏ ngang → hết hạn → hàng tự quay lại.

Hai điểm hay sai:

- **Hàng khả dụng** = tồn − các reservation **còn hạn**. Reservation đã hết hạn phải được coi là không tồn tại
  ngay lập tức, kể cả khi job dọn dẹp chưa chạy.
- **Confirm** một reservation đã hết hạn phải bị từ chối, vì hàng có thể đã được giữ cho người khác.

## Schema (test tạo sẵn)

```sql
CREATE TABLE products (
  sku   TEXT PRIMARY KEY,
  stock INTEGER NOT NULL CHECK (stock >= 0)
);
CREATE TABLE reservations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sku        TEXT NOT NULL REFERENCES products (sku),
  cart_id    TEXT NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  expires_at INTEGER NOT NULL,                -- ms
  status     TEXT NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'confirmed', 'released', 'expired'))
);
```

Reservation **còn hiệu lực** = `status = 'active'` **và** `expires_at > now`.

## Yêu cầu

### 1. `available(db, sku, now)`

`stock` − tổng `qty` các reservation còn hiệu lực. Sku không tồn tại → `0`.

### 2. `reserve(db, { sku, qty, cartId, now, ttlMs = 900_000 })`

- `qty` không phải số nguyên dương → `RangeError`. Sku không tồn tại → `Error` message chứa sku.
- Giỏ `cartId` **đã có** reservation còn hiệu lực cho `sku` này → **cập nhật** reservation đó
  (qty mới, hạn mới `now + ttlMs`) thay vì tạo thêm. Khi kiểm tra đủ hàng, không tính phần giỏ này đang giữ.
- Không đủ hàng khả dụng → `Error` message `'Không đủ hàng: <sku>'`.
- Kiểm tra và ghi trong **một transaction**.
- Trả `{ id, sku, qty, expiresAt }`.

### 3. `confirm(db, reservationId, now)`

- Reservation không còn hiệu lực (không có, đã confirm/release, hoặc **đã quá hạn**) → `Error` message chứa
  `'không còn hiệu lực'`, không đổi gì.
- Ngược lại, trong một transaction: trừ `stock` đúng `qty`, đổi status `'confirmed'`. Trả `true`.

### 4. `release(db, reservationId)`

Reservation đang `'active'` → đổi `'released'`, trả `true`. Còn lại → `false`, không đổi gì.

### 5. `expireReservations(db, now)`

Đổi mọi reservation `'active'` có `expires_at <= now` sang `'expired'`. Trả số dòng đã đổi.

## Chạy

```bash
npm run check nc-15
```

## Tự kiểm tra sau khi đạt

1. Nếu `available` chỉ trừ reservation `status = 'active'` (không xét `expires_at`) thì test nào hỏng, và khách
   hàng thấy hiện tượng gì?
2. TTL dài quá hoặc ngắn quá thì mỗi bên gây hại gì cho shop?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết một hàm nội bộ tính tổng đang giữ có tham số "bỏ qua giỏ X":
`SUM(qty) WHERE sku = ? AND status = 'active' AND expires_at > ? AND cart_id <> ?`.
`confirm`: đọc reservation, kiểm tra hiệu lực, rồi `UPDATE products SET stock = stock - ?` trong cùng transaction.

</details>

## Đọc thêm

- Magento MSI: *reservations* được tạo khi đặt hàng và bù trừ khi giao hàng.
- Redis: giữ chỗ bằng key có TTL (`SET key value NX PX 900000`) cho hệ thống cần nhanh hơn DB.
