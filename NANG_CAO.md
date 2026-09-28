# Mục nâng cao

Phần này lấp các khoảng trống mà lộ trình 13 tuần chưa phủ: các pattern backend hay gặp khi đi làm,
công cụ thực tế (NestJS, PostgreSQL, Redis, CI, monitoring), và kiến thức cho vòng phỏng vấn kỹ thuật.

## Khi nào học phần này

Phần nâng cao **không** thay cho phần lõi. Chỉ vào khi rơi vào một trong các trường hợp sau:

- **Đi nhanh hơn lộ trình:** checkpoint tuần 8 đã xong hết phần lõi của tuần 1–8 và M1–M3.
- **Sau 31/12**, trong lúc nộp CV và chờ phỏng vấn, để tiếp tục nâng cấp dự án.
- **Tin tuyển dụng yêu cầu cụ thể:** JD đòi NestJS hay Redis thì học đúng mục đó, không học tràn lan.

**Không cần làm hết.** Chọn theo tin tuyển dụng thực tế (xem mục 5).

---

## 1. Bài nâng cao tự chấm (`exercises/nc-XX`)

Chạy như bài thường: `npm run check nc-01`. Trong `npm run list`, các bài này hiện ở mục **NÂNG CAO**.
`npm run check` không kèm tên bài sẽ bỏ qua chúng.

### Pattern hạ tầng

| Bài | Học gì | Từ khoá hay gặp trong JD / phỏng vấn |
|---|---|---|
| `nc-01` LRU cache | Cache giới hạn bộ nhớ, TTL, chống gọi trùng | caching, cache invalidation |
| `nc-02` Rate limit nâng cao | Token bucket, sliding window | rate limiting, API gateway |
| `nc-03` Circuit breaker | Ngắt mạch khi dịch vụ ngoài chết | resilience, fault tolerance |
| `nc-04` Request context | `AsyncLocalStorage`, log JSON có request id | structured logging, tracing |
| `nc-05` Graceful shutdown | Tắt server không làm rơi request | Docker, Kubernetes, zero-downtime deploy |
| `nc-06` Worker threads | Đẩy việc nặng CPU ra khỏi event loop | Node performance, event loop blocking |
| `nc-07` Stream backpressure | Xuất file lớn không tràn bộ nhớ | streams, large data export |
| `nc-08` Cursor pagination | Phân trang keyset ổn định | pagination, API design |

### Pattern dữ liệu và hệ phân tán

| Bài | Học gì | Từ khoá |
|---|---|---|
| `nc-09` Optimistic locking | Cột `version`, xung đột khi sửa đồng thời | concurrency control, ETag |
| `nc-10` Idempotency key | Gửi lại request không tạo đơn trùng | idempotency, payment API |
| `nc-11` Outbox | Ghi DB và phát sự kiện không mất, không lệch | transactional outbox, event-driven |
| `nc-12` Job queue | Việc nền, retry, backoff, dead-letter | background jobs, BullMQ, message queue |
| `nc-13` Sổ cái tồn kho | Tồn = tổng các lần nhập/xuất, snapshot | event sourcing, audit trail |
| `nc-14` Saga | Nhiều bước, lỗi giữa chừng thì hoàn tác | distributed transactions, microservices |
| `nc-15` Giữ hàng có hạn | Giữ tồn kho khi checkout, tự hết hạn | inventory reservation |

Thứ tự gợi ý: `nc-08` → `nc-09` → `nc-10` → `nc-11` → `nc-12` trước, vì chúng dùng ngay cho mốc M6–M8 của
dự án lớn. Các bài khác làm theo nhu cầu.

## 2. Ticket nâng cao của Voltix

`voltix-store/tickets/` có VX-31 (cursor pagination), VX-32 (Idempotency-Key khi đặt hàng),
VX-33 (email xác nhận đơn qua outbox). Chỉ có đề bài, bạn tự viết test. Làm bài `nc-08`, `nc-10`, `nc-11`
trước để có nền.

## 2b. Dự án tự dựng (tùy chọn): mốc nâng cao M6–M8

Đặc tả ở cuối [du-an-lon/SPEC.md](du-an-lon/SPEC.md). Chạy bằng `npm run du-an m6`.

| Mốc | Nội dung | Bài liên quan |
|---|---|---|
| **M6** Hiệu năng & đồng thời | Cursor pagination, ETag / `If-None-Match` (304), `If-Match` (412) | nc-08, nc-09 |
| **M7** Idempotency | Header `Idempotency-Key` cho `POST /orders` | nc-10 |
| **M8** Sự kiện & việc nền | Outbox, danh sách sự kiện, gửi webhook ra ngoài có ký HMAC và retry, audit log | nc-11, nc-12 |

Xong M6–M8 là dự án có đủ chất liệu cho câu hỏi phỏng vấn kiểu "hệ thống của bạn xử lý tình huống X thế nào?".

---

## 3. Dự án mở rộng dùng công cụ thực tế

Phần này cần cài thêm công cụ nên không chấm tự động. Mỗi mục có checklist **"Xong khi"**. Chỉ tính là xong
khi mọi ô đều đúng và bạn giải thích được từng quyết định.

### 3.1 PostgreSQL + Docker Compose (3–5 ngày)

Làm nếu trong lộ trình dự án lớn vẫn còn chạy bằng SQLite hoặc lưu trong bộ nhớ.

- [ ] `docker compose up` dựng được app + PostgreSQL. Không có secret nào trong git.
- [ ] Có migration (ví dụ `node-pg-migrate`, Knex, Prisma hoặc Drizzle), chạy lại từ đầu được.
- [ ] Test chạy trên DB test riêng và dọn dữ liệu giữa các test. `npm run du-an all` vẫn đạt.
- [ ] Giải thích được `SELECT ... FOR UPDATE` và mức isolation mặc định của PostgreSQL (READ COMMITTED).

### 3.2 NestJS (1–2 tuần)

Nhiều công ty Node ở Việt Nam dùng NestJS. Với bạn, cách tổ chức của NestJS (module, DI, decorator) khá gần
với Magento 2: dependency injection qua constructor, tách tầng rõ ràng.

- [ ] Viết lại M1–M3 bằng NestJS: module, controller, service, repository.
- [ ] Validation bằng DTO (`class-validator`), auth bằng Guard, format lỗi bằng Exception Filter.
- [ ] **Bộ test nghiệm thu cũ vẫn đạt.** `createApp()` gọi `await app.init()` rồi trả `app.getHttpServer()`.
- [ ] Giải thích được: DI container của Nest khác gì `di.xml` của Magento, và Interceptor khác Middleware ở đâu.

### 3.3 Redis (1 tuần)

- [ ] Cache `GET /products/:id` bằng Redis, xoá cache khi sản phẩm đổi. Đo trước/sau.
- [ ] Rate limit dùng chung Redis, đúng cả khi chạy **2 instance** app sau một reverse proxy.
- [ ] Thay job queue tự viết (M8 / nc-12) bằng BullMQ.
- [ ] Giải thích được vì sao cache trong bộ nhớ (nc-01) sai khi có nhiều instance.

### 3.4 CI/CD (2–3 ngày)

- [ ] GitHub Actions chạy lint + test mỗi lần push/PR, có PostgreSQL chạy dạng service container.
- [ ] Dockerfile multi-stage, image chạy bằng user không phải root.
- [ ] Merge vào nhánh chính thì tự deploy lên một host miễn phí hoặc rẻ.
- [ ] README có badge trạng thái CI.

### 3.5 Monitoring (3–4 ngày)

- [ ] Log JSON bằng `pino`, mỗi dòng có request id (nối với nc-04).
- [ ] Endpoint `/metrics` (`prom-client`): số request, độ trễ theo route, số đơn tạo mới.
- [ ] Trace một request đi qua HTTP → service → DB bằng OpenTelemetry, xem được trên Jaeger chạy local.

### 3.6 Kiểm tra tải và tối ưu (2–3 ngày)

- [ ] Chạy load test (`autocannon` hoặc `k6`) cho `GET /products` và `POST /orders`, ghi số liệu vào README.
- [ ] Tìm và sửa ít nhất một điểm nghẽn thật (thiếu index, truy vấn N+1, chặn event loop), có số liệu trước/sau.

### 3.7 Shopify app thật (1–2 tuần): điểm nhấn portfolio

Đây là mục khớp nhất với kinh nghiệm của bạn.

- [ ] Tạo Partner account và development store miễn phí, dựng app bằng Shopify CLI (template Node chính thức).
- [ ] Nhận webhook `orders/create` và `products/update` thật, xác thực HMAC (đã làm ở w8-03).
- [ ] Đồng bộ đơn và tồn kho từ Shopify sang Order & Inventory API của bạn, có retry và idempotency.
- [ ] Gọi Admin API (GraphQL), tôn trọng rate limit (nối với w3-50, nc-02).
- [ ] README giải thích luồng dữ liệu bằng sơ đồ.

---

## 4. Kiến thức nền cho phỏng vấn

Không có bài chấm. Tự kiểm tra bằng cách **giải thích to thành lời trong 2–3 phút mỗi câu**, hoặc dùng
`/bai-bien-the` / `npm run context` để AI hỏi vặn.

**Node.js bên trong**
- Các pha của event loop, microtask và macrotask, `process.nextTick`.
- libuv thread pool: việc nào chạy trong đó (fs, crypto, dns), và `UV_THREADPOOL_SIZE`.
- Rò rỉ bộ nhớ: nguyên nhân hay gặp, cách chụp heap snapshot và đọc nó.
- Khi nào dùng `cluster`, `worker_threads`, hoặc chạy nhiều process sau load balancer.

**Database**
- Các mức isolation, dirty read / non-repeatable read / phantom read.
- Index B-tree hoạt động ra sao, index nhiều cột, đọc `EXPLAIN ANALYZE`.
- Truy vấn N+1 là gì, cách phát hiện và cách sửa.

**Thiết kế hệ thống (mức junior+)**
- Scale theo chiều ngang, ứng dụng stateless, session nên để ở đâu.
- Đặt cache ở đâu, cache-aside, chiến lược xoá cache.
- Khi nào dùng queue, at-least-once delivery và vì sao cần idempotency.
- Thiết kế lại chính dự án của bạn cho 100 lần tải hiện tại: nghẽn ở đâu trước?

**Bảo mật**
- OWASP Top 10: nói được ít nhất 5 mục kèm ví dụ trong dự án của bạn.
- CORS, CSRF, XSS khác nhau thế nào. JWT so với session.

## 5. Chọn gì theo loại tin tuyển dụng

| JD nhấn mạnh | Ưu tiên |
|---|---|
| NestJS, TypeScript | 3.2 → 3.1 → M6–M7 |
| Microservices, message queue | nc-11, nc-12, nc-14 → M8 → 3.3 (BullMQ) |
| Hiệu năng, hệ thống tải cao | nc-01, nc-06, nc-08 → 3.3 → 3.6 |
| DevOps, cloud | 3.1 → 3.4 → 3.5 → nc-05 |
| Ecommerce, tích hợp | 3.7 → nc-10, nc-13, nc-15 → M7–M8 |

Một mục nâng cao làm kỹ, có trong dự án và giải thích được, có giá trị hơn năm mục làm lướt.
