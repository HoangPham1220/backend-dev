# nc-12 · Job queue: việc nền có retry, backoff và dead-letter

**Mục tiêu:** tự xây một hàng đợi việc nền lưu trong DB, chịu được handler lỗi và worker chết giữa chừng.

## Vì sao quan trọng khi đi làm

Gửi email xác nhận đơn, xuất hoá đơn PDF, đồng bộ tồn kho sang Shopify… không nên làm ngay trong request HTTP
(chậm, dịch vụ ngoài có thể lỗi). Ta **đẩy vào hàng đợi**, trả response ngay, để **worker** xử lý sau.

Một hàng đợi dùng được trong thực tế phải trả lời được:

| Câu hỏi | Cơ chế trong bài |
|---|---|
| Hai worker có lấy trùng một việc không? | Nhận việc bằng một câu `UPDATE` có điều kiện, khoá bằng `locked_until` |
| Handler lỗi thì sao? | Thử lại sau, khoảng chờ tăng dần (**exponential backoff**) |
| Lỗi mãi không hết? | Sau `max_attempts` lần → trạng thái `dead` (**dead-letter**), chờ người xử lý |
| Worker chết khi đang chạy việc? | Khoá có hạn (**visibility timeout**): hết hạn thì worker khác nhận lại |

Magento dùng cron + bảng `queue_message` / RabbitMQ; Node thường dùng **BullMQ** (Redis) hoặc **pg-boss** (PostgreSQL).
Bài này làm phiên bản tối giản của pg-boss trên SQLite.

## Schema (test tạo sẵn)

```sql
CREATE TABLE jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL,
  payload      TEXT NOT NULL,                 -- JSON
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'running', 'done', 'dead')),
  attempts     INTEGER NOT NULL DEFAULT 0,    -- số lần đã được nhận để chạy
  max_attempts INTEGER NOT NULL,
  run_at       INTEGER NOT NULL,              -- mốc thời gian (ms) sớm nhất được chạy
  locked_until INTEGER,                       -- đang chạy: khoá tới mốc này
  last_error   TEXT,
  result       TEXT                           -- JSON kết quả khi done
);
```

Thời gian là số mili giây, luôn lấy từ `now()` truyền vào (test điều khiển đồng hồ).

## Yêu cầu

### 1. `enqueue(db, type, payload, { runAt = 0, maxAttempts = 3 } = {})`

Thêm job `pending`, `payload` lưu dạng JSON. Trả `id` (number).

### 2. `createWorker(db, handlers, { now, visibilityTimeoutMs = 30_000, backoff })`

- `handlers`: object `{ [type]: async (payload, job) => result }`, `job` là `{ id, attempts }`.
- `backoff(attempts)` mặc định `1000 * 2 ** (attempts - 1)` → 1000, 2000, 4000… ms.

Trả object `{ tick }`. `tick()` (async) xử lý **tối đa một** job rồi trả `{ id, status }` (status sau khi xử lý),
hoặc `null` nếu không có job nào để làm.

**Nhận job:** job được nhận nếu

- `status = 'pending'` và `run_at <= now()`, hoặc
- `status = 'running'` nhưng `locked_until <= now()` (worker trước đã chết).

Ưu tiên `run_at` nhỏ nhất, rồi `id` nhỏ nhất. Khi nhận: `status = 'running'`, `attempts + 1`,
`locked_until = now() + visibilityTimeoutMs`. Việc chọn và khoá phải là **một thao tác nguyên tử**
(hai worker không thể cùng nhận một job).

**Xử lý:**

- Job `running` hết hạn khoá mà đã dùng hết lượt (`attempts >= max_attempts`) → không chạy nữa, chuyển `dead`
  với `last_error = 'Worker không phản hồi'`.
- Không có handler cho `type` → `dead`, `last_error` chứa tên type.
- Handler thành công → `done`, lưu `result` (JSON), `locked_until = NULL`.
- Handler lỗi:
  - `attempts < max_attempts` → về `pending`, `run_at = now() + backoff(attempts)`, lưu `last_error`, `locked_until = NULL`.
  - Hết lượt → `dead`, lưu `last_error`.

### 3. `stats(db)`

Trả `{ pending, running, done, dead }` (số job mỗi trạng thái, trạng thái không có job là `0`).

## Chạy

```bash
npm run check nc-12
```

## Tự kiểm tra sau khi đạt

1. `visibilityTimeoutMs` đặt quá ngắn so với thời gian handler chạy thì chuyện gì xảy ra? Handler phải có tính
   chất gì để chuyện đó không gây hại?
2. Vì sao cần backoff tăng dần mà không thử lại ngay?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

SQLite hỗ trợ `UPDATE ... RETURNING *`. Nhận job bằng:
`UPDATE jobs SET ... WHERE id = (SELECT id FROM jobs WHERE <điều kiện> ORDER BY run_at, id LIMIT 1) RETURNING *`.
Một câu lệnh = nguyên tử. PostgreSQL làm tương tự với `FOR UPDATE SKIP LOCKED`.

</details>

## Đọc thêm

- BullMQ (Redis), pg-boss / graphile-worker (PostgreSQL), AWS SQS (*visibility timeout*, *dead-letter queue*).
- PostgreSQL: `SELECT ... FOR UPDATE SKIP LOCKED` cho hàng đợi nhiều worker.
