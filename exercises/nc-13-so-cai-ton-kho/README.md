# nc-13 · Sổ cái tồn kho: tồn kho là tổng các lần nhập xuất

**Mục tiêu:** lưu tồn kho dưới dạng **lịch sử biến động** (ledger) thay vì một con số bị ghi đè, để truy vết
được "vì sao tồn kho là X" và tính tồn tại bất kỳ thời điểm nào.

## Vì sao quan trọng khi đi làm

Ticket support kinh điển: *"Sản phẩm A hôm qua còn 50, sao hôm nay còn 12? Ai trừ?"*. Nếu bảng `products` chỉ có
cột `stock` bị `UPDATE` liên tục, câu trả lời đã mất.

Với sổ cái, mọi thay đổi là một dòng **không bao giờ sửa, không bao giờ xoá**:

| id | sku | delta | reason | ref |
|---|---|---|---|---|
| 1 | AO-001 | +50 | receive | PO-2026-11 |
| 2 | AO-001 | −3 | sale | ORDER-1001 |
| 3 | AO-001 | +1 | return | RMA-17 |

Tồn hiện tại = tổng `delta`. Muốn sửa sai thì ghi thêm một dòng bù trừ, như kế toán. Đây là dạng đơn giản của
**event sourcing**. Magento MSI có bảng `inventory_reservation` hoạt động theo đúng ý tưởng này.

Tổng hàng triệu dòng mỗi lần thì chậm → định kỳ chụp **snapshot** (tồn tại một thời điểm), sau đó chỉ cộng các
dòng mới hơn snapshot.

## Schema (test tạo sẵn)

```sql
CREATE TABLE stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sku        TEXT NOT NULL,
  delta      INTEGER NOT NULL CHECK (delta <> 0),
  reason     TEXT NOT NULL CHECK (reason IN ('receive', 'sale', 'return', 'adjustment')),
  ref        TEXT,
  created_at INTEGER NOT NULL                  -- ms
);
CREATE TABLE stock_snapshots (
  sku              TEXT NOT NULL,
  qty              INTEGER NOT NULL,
  at               INTEGER NOT NULL,           -- ms, thời điểm chụp
  last_movement_id INTEGER NOT NULL,           -- id movement cuối cùng đã tính vào qty (0 nếu chưa có)
  PRIMARY KEY (sku, at)
);
```

## Yêu cầu

Thời gian (`now`, `at`) là số ms truyền vào. Test ghi movement với `now` tăng dần.

### 1. `recordMovement(db, { sku, delta, reason, ref = null, now })`

- `delta` phải là số nguyên khác 0, `reason` thuộc 4 giá trị trên → sai thì `RangeError`.
- **Chống trùng:** đã có movement cùng `sku`, `reason`, `ref` (với `ref` khác null) → không ghi thêm, trả `id` cũ.
  (Webhook đơn hàng gửi lại hai lần không được trừ kho hai lần.)
- Không cho tồn âm: tồn hiện tại + `delta` < 0 → throw `Error` message `'Không đủ hàng: <sku>'`.
  Kiểm tra và ghi trong **một transaction**.
- Trả `id` của movement (number).

### 2. `getStock(db, sku, { at } = {})`

Tồn kho của `sku`, tính các movement có `created_at <= at` (không truyền `at` → tính tất cả).
Nếu có snapshot phù hợp thì **phải dùng** snapshot mới nhất có `snapshot.at <= at`, cộng thêm các movement có
`id > last_movement_id` và `created_at <= at`. Kết quả phải giống hệt tính từ đầu.

### 3. `createSnapshot(db, sku, now)`

Chụp tồn hiện tại của `sku` tại thời điểm `now`. Trả `{ sku, qty, at, lastMovementId }`.

### 4. `reconcile(db, sku, countedQty, { ref, now })`

Kiểm kê: đếm thực tế được `countedQty`.
- `countedQty` không phải số nguyên `>= 0` → `RangeError`.
- Lệch với tồn trong sổ → ghi một movement `adjustment` với `delta` = chênh lệch, trả movement đó
  `{ id, delta }`. Không lệch → không ghi gì, trả `null`.

### 5. `history(db, sku)`

Danh sách movement theo thứ tự `id`, mỗi phần tử `{ id, delta, reason, ref, balance }`, `balance` là tồn sau dòng đó.

## Chạy

```bash
npm run check nc-13
```

## Tự kiểm tra sau khi đạt

1. Test "xoá movement cũ sau snapshot" chứng minh điều gì? Ngoài đời, khi nào mới được lưu trữ/xoá movement cũ?
2. So với cột `stock` bị `UPDATE`: sổ cái tốn thêm gì, và đổi lại được gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`getStock`: tìm snapshot bằng `SELECT ... WHERE sku = ? AND at <= ? ORDER BY at DESC LIMIT 1`. Không có thì coi như
`qty = 0, last_movement_id = 0`. Sau đó `SELECT COALESCE(SUM(delta), 0) ... WHERE id > ? AND created_at <= ?`.
`history`: tự cộng dồn trong JS, hoặc dùng window function `SUM(delta) OVER (ORDER BY id)`.

</details>

## Đọc thêm

- Martin Fowler: *Event Sourcing*. Magento 2 MSI: *Reservations* (`inventory_reservation`).
- Kế toán kép (double-entry bookkeeping): nguồn gốc của ý tưởng "không sửa, chỉ ghi bù".
