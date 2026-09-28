# Order & Inventory API: đặc tả

Backend cho một shop nhỏ: quản lý sản phẩm, tồn kho, đơn hàng, tài khoản, và nhận đơn từ Shopify qua webhook.
Làm dần từ tuần 4 đến tuần 11, mỗi mốc có bộ test nghiệm thu.

Bạn **tự chọn** cách cài đặt (node:http hay Express, PostgreSQL/MySQL/SQLite, có ORM hay không, JS hay TS).
Test chỉ nói chuyện với app qua HTTP, không quan tâm bên trong.

---

## 1. Hợp đồng với bộ test

File `du-an-lon/src/app.js` export:

```js
export async function createApp() { /* ... */ return app; }
export async function closeApp(app) { /* tuỳ chọn: đóng kết nối DB */ }
```

- `createApp()` trả về **Express app** (function) hoặc **`http.Server` chưa `listen`**. Harness tự listen port ngẫu nhiên.
- **Mỗi lần gọi `createApp()` phải là một app với dữ liệu trống.** Test gọi nó cho từng test case.
  - Lưu trong bộ nhớ (tuần 4): tạo mảng/Map mới bên trong `createApp`, không để ở cấp module.
  - Dùng DB thật (tuần 5 trở đi): dùng DB riêng cho test (ví dụ `DATABASE_URL` của môi trường test) và
    xoá dữ liệu trong `createApp` (`TRUNCATE ... RESTART IDENTITY CASCADE` với PostgreSQL), hoặc SQLite `:memory:`.
    Có kết nối thì export `closeApp(app)` để đóng, không thì test chạy xong bị treo.
- Biến môi trường harness đặt sẵn trước khi import app:

  | Biến | Giá trị test | Dùng cho |
  |---|---|---|
  | `NODE_ENV` | `test` | bật route `/__test/error` (M5) |
  | `JWT_SECRET` | chuỗi cố định | ký JWT (M3) |
  | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@shop.test` / `Admin@12345` | seed tài khoản admin khi `createApp` (M3) |
  | `WEBHOOK_SECRET` | chuỗi cố định | xác thực webhook (M4) |

- Đổi file điểm vào (ví dụ khi chuyển TypeScript và build ra `dist/`):
  `APP_ENTRY=/đường/dẫn/tuyệt/đối/dist/app.js npm run du-an m1`.

### Chạy test

```bash
npm run du-an m1      # chỉ mốc 1
npm run du-an m2      # ...
npm run du-an         # các mốc chính M1–M5
npm run du-an all     # tất cả, kể cả mốc nâng cao M6–M8
```

Tương đương `node --test du-an-lon/tests/m1-*.test.js`. Test mốc trước phải **tiếp tục đạt** khi làm mốc sau.
Harness tự nhận biết bạn đã làm auth hay chưa: trước M3 request gửi không token, từ M3 trở đi gửi token admin/khách.

---

## 2. Quy ước chung

- Request và response đều là JSON (`Content-Type: application/json`), kể cả lỗi và 404. Không trả HTML.
- Thành công: bọc trong `data`. Danh sách có thêm `meta`:

  ```json
  { "data": { "id": 1, "sku": "TSHIRT-M" } }
  { "data": [ ... ], "meta": { "page": 1, "perPage": 20, "total": 25 } }
  ```

- Lỗi: một định dạng duy nhất. `details` là tuỳ chọn:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ",
               "details": [ { "field": "price", "message": "price là số nguyên >= 0" } ] } }
  ```

- `id` do server sinh (số hay chuỗi đều được). Client coi như giá trị không rõ nghĩa và dùng lại y nguyên.
  Id không tồn tại hoặc sai định dạng (ví dụ `/products/abc`) đều trả **404**, không được trả 500.
- Tiền là **số nguyên VND**.
- Phân trang: `?page` (mặc định 1) và `?perPage` (mặc định 20, tối đa 100) phải là số nguyên dương. Sai → 422.
  Trang vượt quá dữ liệu thì trả `data: []`, không phải lỗi. Danh sách sắp theo thứ tự tạo, cũ trước.

### Mã lỗi

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `INVALID_JSON` | body không phải JSON hợp lệ |
| 401 | `UNAUTHORIZED` | thiếu token, token sai/hết hạn, đăng nhập sai |
| 401 | `INVALID_SIGNATURE` | chữ ký webhook sai hoặc thiếu |
| 403 | `FORBIDDEN` | đã đăng nhập nhưng không đủ quyền |
| 404 | `NOT_FOUND` | route hoặc tài nguyên không tồn tại |
| 409 | `CONFLICT` | trùng dữ liệu duy nhất (sku, email) |
| 409 | `INSUFFICIENT_STOCK` | không đủ hàng |
| 409 | `INVALID_STATE` | chuyển trạng thái đơn không hợp lệ |
| 413 | `PAYLOAD_TOO_LARGE` | body quá 1MB |
| 422 | `VALIDATION_ERROR` | dữ liệu sai; `details` liệt kê **mọi** field sai trong một lần |
| 500 | `INTERNAL_ERROR` | lỗi không lường trước; không lộ message gốc hay stack |

---

## 3. M1 · Sản phẩm (tuần 4)

**Product**

```json
{ "id": 1, "sku": "TSHIRT-M", "name": "Áo thun cotton size M", "price": 150000,
  "stock": 0, "status": "active", "createdAt": "2026-10-22T03:00:00.000Z" }
```

| Field | Luật |
|---|---|
| `sku` | bắt buộc, chuỗi không rỗng sau khi trim, tối đa 64 ký tự, **duy nhất** |
| `name` | bắt buộc, chuỗi không rỗng, tối đa 200 ký tự |
| `price` | bắt buộc, số nguyên >= 0 (chuỗi `"150000"` là sai) |
| `stock` | chỉ nhận khi tạo, số nguyên >= 0, mặc định 0. Sau đó **chỉ đổi qua `/inventory/adjustments`** |
| `status` | `active` hoặc `inactive`, mặc định `active` |

| Method | Path | Kết quả |
|---|---|---|
| `POST` | `/products` | 201 + product · 422 · 409 trùng sku |
| `GET` | `/products?q=&page=&perPage=` | 200 + danh sách. `q` tìm trong `name` hoặc `sku`, không phân biệt hoa thường; `meta.total` đếm sau khi lọc |
| `GET` | `/products/:id` | 200 · 404 |
| `PATCH` | `/products/:id` | 200 + product đã sửa. Chỉ sửa field được gửi (`sku`, `name`, `price`, `status`). Gửi `stock` → 422. Trùng sku → 409 |
| `DELETE` | `/products/:id` | 204 không body · 404 |

Route không tồn tại → 404 `NOT_FOUND` dạng JSON.

**Gợi ý tái dùng:** các bài `w4-*` (router, middleware, validation, xử lý lỗi).

---

## 4. M2 · Tồn kho và đơn hàng (tuần 5–6)

### Điều chỉnh tồn kho

`POST /inventory/adjustments`

```json
// request
{ "productId": 1, "quantity": -3, "reason": "Hàng lỗi trả NCC" }
// 201
{ "data": { "id": 7, "productId": 1, "quantity": -3, "reason": "Hàng lỗi trả NCC", "stockAfter": 9, "createdAt": "..." } }
```

- `quantity` là số nguyên khác 0: dương là nhập kho, âm là xuất kho. `reason` bắt buộc. Sai → 422.
- Sản phẩm không tồn tại → 404. Tồn kho sau điều chỉnh bị âm → 409 `INSUFFICIENT_STOCK`, không đổi gì.
- Nên lưu lịch sử điều chỉnh vào bảng riêng, giống `cataloginventory` và lịch sử stock trong Magento.

### Đơn hàng

**Order**

```json
{ "id": 12, "status": "pending", "customerId": 3, "source": "api", "externalId": null,
  "items": [ { "productId": 1, "sku": "TSHIRT-M", "name": "Áo thun M", "price": 150000, "quantity": 2, "lineTotal": 300000 } ],
  "total": 300000, "createdAt": "..." }
```

| Method | Path | Kết quả |
|---|---|---|
| `POST` | `/orders` | body `{ "items": [ { "productId", "quantity" } ] }` → 201 + order `pending` |
| `GET` | `/orders?page=&perPage=` | 200 + danh sách |
| `GET` | `/orders/:id` | 200 · 404 |
| `POST` | `/orders/:id/pay` | `pending` → `paid` |
| `POST` | `/orders/:id/ship` | `paid` → `shipped` |
| `POST` | `/orders/:id/cancel` | `pending` hoặc `paid` → `cancelled`, **hoàn tồn kho** |

Luật nghiệp vụ:

1. `items` là mảng không rỗng; `quantity` là số nguyên dương; sản phẩm phải tồn tại, đang `active`, không trùng trong
   cùng đơn. Sai → 422.
2. **Chụp giá (snapshot):** item lưu `sku`, `name`, `price` tại thời điểm đặt. Sửa sản phẩm sau đó không làm đổi đơn cũ.
3. **Nguyên tử:** thiếu hàng ở bất kỳ item nào → 409 `INSUFFICIENT_STOCK`, `details` là
   `[{ "productId", "requested", "available" }]`, và **không item nào bị trừ kho**.
4. **Không bán vượt:** nhiều đơn đồng thời không được làm tồn kho âm. Với DB thật, dùng transaction cùng
   `UPDATE ... SET stock = stock - ? WHERE id = ? AND stock >= ?` (kiểm tra số dòng bị ảnh hưởng) hoặc `SELECT ... FOR UPDATE`.
   Đọc tồn kho, kiểm tra trong JS rồi mới ghi là **sai** khi có đồng thời.
5. Chuyển trạng thái sai (ship đơn pending, pay hai lần, huỷ đơn đã giao/đã huỷ) → 409 `INVALID_STATE`.
   Huỷ hai lần không được hoàn kho hai lần.

Chưa có auth thì `customerId` là `null`.

**Gợi ý tái dùng:** bài SQL tuần 5–6, đặc biệt `w6-03` (repository) và bài transaction.

---

## 5. M3 · Xác thực và phân quyền (tuần 8)

| Method | Path | Kết quả |
|---|---|---|
| `POST` | `/auth/register` | body `{ email, password, name }` → 201 + user (role luôn `customer`) |
| `POST` | `/auth/login` | body `{ email, password }` → 200 `{ "data": { "token", "user" } }` |
| `GET` | `/auth/me` | 200 + user hiện tại |

- **User** trả ra: `{ id, email, name, role }`. **Không bao giờ** trả mật khẩu, hash hay salt.
- Email được trim và chuyển chữ thường; trùng (không phân biệt hoa thường) → 409. Email sai định dạng,
  mật khẩu dưới 8 ký tự, thiếu `name` → 422. Trường `role` client gửi lên phải bị bỏ qua.
- Mật khẩu lưu bằng hàm hash chậm có salt (`scrypt`/`bcrypt`/`argon2`), không dùng md5/sha1.
- Đăng nhập sai email hay sai mật khẩu đều trả **401 cùng một message**, để không lộ email nào đã đăng ký.
- Token: **JWT HS256** ký bằng `JWT_SECRET`, payload có `sub` (id user), `role`, `exp` (giây). Gửi qua
  `Authorization: Bearer <token>`. Token thiếu, sai chữ ký, bị sửa payload, hết hạn hoặc `alg: none` → 401.
- Khi `createApp`, seed một tài khoản `admin` từ `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**Phân quyền**

| Hành động | Khách vãng lai | Customer | Admin |
|---|---|---|---|
| Xem sản phẩm | ✓ | ✓ | ✓ |
| Tạo/sửa/xoá sản phẩm, điều chỉnh kho | 401 | 403 | ✓ |
| Đặt hàng (`customerId` lấy từ token) | 401 | ✓ | ✓ |
| Xem đơn, `GET /orders` | 401 | chỉ đơn của mình | tất cả |
| Xem/huỷ đơn **của người khác** | 401 | **404** (không để lộ đơn có tồn tại) | ✓ |
| Pay, ship | 401 | 403 | ✓ |
| Huỷ đơn của mình | 401 | chỉ khi `pending`; đơn `paid` → 403 | ✓ |

**Gợi ý tái dùng:** các bài `w8-*` (hash mật khẩu, JWT, phân quyền).

---

## 6. M4 · Webhook đơn hàng kiểu Shopify (tuần 10)

`POST /webhooks/orders`, không cần JWT. Xác thực bằng chữ ký:

| Header | Ý nghĩa |
|---|---|
| `x-shopify-hmac-sha256` | base64 của HMAC-SHA256(**raw body**, `WEBHOOK_SECRET`) |
| `x-shopify-webhook-id` | id duy nhất của lần gửi, dùng để chống xử lý trùng |

```json
{ "id": "SHOP-1001", "email": "buyer@example.com", "line_items": [ { "sku": "TSHIRT-M", "quantity": 2 } ] }
```

1. **Chữ ký tính trên raw body** (bytes gốc), không phải trên `JSON.stringify(req.body)`. Với Express, dùng
   `express.raw({ type: 'application/json' })` cho riêng route này. So sánh bằng `crypto.timingSafeEqual`.
   Sai hoặc thiếu → 401 `INVALID_SIGNATURE`, không làm gì cả.
2. Thiếu `x-shopify-webhook-id`, `line_items` rỗng, sku không có trong hệ thống → 422. Thiếu hàng → 409.
3. Thành công → **200** `{ "data": { "orderId", "duplicate": false } }`. Shopify coi mọi mã khác 2xx là lỗi và gửi lại.
   Đơn tạo ra có `source: "webhook"`, `externalId` = `id` trong payload, giá lấy từ sản phẩm trong hệ thống.
4. **Idempotent:** cùng `x-shopify-webhook-id` gửi lại → 200 `{ "orderId": <id cũ>, "duplicate": true }`, không tạo đơn,
   không trừ kho. Kể cả khi nhiều bản trùng đến **cùng lúc**. Với DB, dùng bảng `processed_webhooks` có
   `UNIQUE(webhook_id)` và ghi trong cùng transaction với đơn hàng.
5. Chỉ ghi nhận "đã xử lý" khi **thành công**. Lần gửi bị 409 thiếu hàng thì lần gửi lại (cùng id) vẫn được xử lý.

---

## 7. M5 · Chất lượng vận hành (tuần 9–11)

- `GET /health` → 200 `{ "status": "ok" }` (không bọc `data`), không cần đăng nhập.
- **Request id:** mọi response (kể cả lỗi) có header `x-request-id`. Client gửi `x-request-id` hợp lệ
  (1–128 ký tự chữ, số, `-`, `_`) thì giữ nguyên; không có hoặc không hợp lệ thì sinh mới (`crypto.randomUUID()`).
  Ghi request id vào mọi dòng log.
- **Lỗi 500:** trả `INTERNAL_ERROR` với message chung, không lộ message gốc hay stack trace. Chi tiết chỉ ghi vào log.
  Server phải tiếp tục phục vụ sau lỗi.
- Khi `NODE_ENV=test`, route `GET /__test/error` ném `new Error('boom: mat khau db la 123')` để test kiểm tra điều trên.
  Môi trường khác thì route này là 404.
- JSON hỏng → 400 `INVALID_JSON`. Body > 1MB → 413 `PAYLOAD_TOO_LARGE`.

Không có test nhưng nên làm ở mốc này: log có cấu trúc (JSON), graceful shutdown (bắt `SIGTERM`, đóng server và
kết nối DB), unit test cho service, xem checklist trong `README.md`.

---

## 8. Gợi ý cấu trúc (không bắt buộc)

```
src/
  app.js              createApp(): tạo app, gắn middleware, route, error handler
  server.js           điểm chạy thật: đọc env, createApp(), listen(PORT)
  config.js           đọc và validate biến môi trường (bài w2-06)
  routes/             nhận request, gọi service, trả response; không chứa luật nghiệp vụ
  services/           luật nghiệp vụ: đặt hàng, huỷ đơn, xử lý webhook
  repositories/       truy vấn DB; service không viết SQL trực tiếp
  middlewares/        auth, request id, xử lý lỗi, giới hạn body
  errors.js           class lỗi có status + code, map sang JSON ở một chỗ
```

Nếu từng làm Magento: `routes` giống Controller, `services` giống Service/Model, `repositories` giống Repository/ResourceModel.

---

# Mốc nâng cao (tùy chọn)

**Chỉ làm sau khi M1–M5 đã đạt**, khi còn thời gian trong lộ trình hoặc sau 31/12 lúc chờ phỏng vấn. Đây là các
bài toán hay gặp ở hệ thống thật và câu hỏi phỏng vấn backend. Test M1–M5 vẫn phải tiếp tục đạt.

`npm run du-an` (không tham số) chỉ chạy các mốc chính M1–M5. Chạy mốc nâng cao: `npm run du-an m6`, hoặc
`npm run du-an all` để chạy tất cả.

M7 và M8 cần có auth (M3): harness báo lỗi rõ nếu chưa có. Biến môi trường harness đặt thêm:

| Biến | Giá trị test | Dùng cho |
|---|---|---|
| `LOW_STOCK_THRESHOLD` | `5` | ngưỡng tồn kho thấp (M8), mặc định 5 nếu không có |
| `EVENT_RETRY_BASE_MS` | `20` | thời gian chờ gốc trước khi gửi lại sự kiện (M8). Production nên để khoảng 1000 |

Mã lỗi thêm:

| HTTP | `code` | Khi nào |
|---|---|---|
| 409 | `REQUEST_IN_PROGRESS` | (M7, tuỳ chọn) request cùng Idempotency-Key đang được xử lý |
| 412 | `PRECONDITION_FAILED` | (M6) `If-Match` không khớp phiên bản hiện tại |
| 422 | `IDEMPOTENCY_KEY_REUSED` | (M7) cùng Idempotency-Key nhưng body khác |

---

## 9. M6 · Hiệu năng và đồng thời

### Phân trang bằng cursor

`GET /products?limit=&after=` (vẫn dùng được với `?q=`). Có `limit` hoặc `after` là chế độ cursor:

```json
{ "data": [ ... ], "meta": { "limit": 20, "nextCursor": "eyJpZCI6MjB9" } }
```

- `limit`: số nguyên 1–100, mặc định 20. `after`: giá trị `nextCursor` của trang trước. `nextCursor` là `null` khi hết.
- Cursor là chuỗi **không rõ nghĩa** với client (thường là base64 của khoá sắp xếp của phần tử cuối, ví dụ `{"id":20}`).
  Cursor rác hoặc bị sửa → 422 (field `after`). Trộn `page`/`perPage` với `limit`/`after` → 422.
- Khác offset: trang sau bắt đầu **ngay sau phần tử cuối đã thấy**, nên xoá hoặc thêm dữ liệu giữa hai lần gọi
  không làm trượt hay lặp phần tử. SQL: `WHERE id > :lastId ORDER BY id LIMIT :limit + 1` (lấy dư 1 để biết còn trang sau),
  thay cho `OFFSET`, vốn phải đếm bỏ qua mọi dòng phía trước nên chậm dần ở trang sâu.
- Phân trang `page`/`perPage` của M1 vẫn phải chạy như cũ.

### ETag và cập nhật có điều kiện

- `GET /products/:id` trả header `ETag` **mạnh** (chuỗi trong ngoặc kép, ví dụ `"v7"` hoặc hash nội dung).
  ETag phải đổi khi **bất kỳ** field nào trong response đổi, kể cả `stock`.
- Gửi `If-None-Match: <etag>` mà dữ liệu chưa đổi → **304** không body, vẫn kèm `ETag`. Tiết kiệm băng thông cho client/CDN.
- `PATCH /products/:id` với `If-Match: <etag>`: khớp phiên bản hiện tại thì sửa, trả 200 kèm `ETag` mới; lệch → **412**
  `PRECONDITION_FAILED`, không sửa gì. Không gửi `If-Match` thì vẫn sửa được như M1.
- **Optimistic locking:** nhiều request cùng `If-Match` đến đồng thời thì đúng 1 thắng. Với DB: cột `version`,
  `UPDATE products SET ..., version = version + 1 WHERE id = ? AND version = ?` rồi kiểm tra số dòng bị ảnh hưởng.
  Đọc, so sánh trong JS rồi mới ghi là **sai** khi có đồng thời (giống luật chống bán vượt ở M2).

**Bài liên quan:** `nc-08` (cursor), `nc-09` (optimistic locking).

---

## 10. M7 · Idempotency cho đặt hàng

Mạng chập chờn hoặc khách bấm "Đặt hàng" hai lần: client gửi lại cùng request và **không được** tạo đơn thứ hai.
Client gửi header `Idempotency-Key` (chuỗi 1–255 ký tự, thường là UUID) với `POST /orders`:

1. Key tính **theo từng người dùng**: hai user dùng trùng key không ảnh hưởng nhau.
2. Lần đầu: xử lý bình thường. Thành công thì **lưu lại status + body response** cùng dấu vân tay của request
   (ví dụ SHA-256 của raw body).
3. Gửi lại cùng key, cùng body → trả **đúng status và body đã lưu** (không tính lại, kể cả khi đơn đã đổi trạng thái),
   kèm header `Idempotent-Replayed: true`. Không tạo đơn, không trừ kho.
4. Cùng key, **khác** body → 422 `IDEMPOTENCY_KEY_REUSED`.
5. Request lỗi (4xx) **không** được lưu: gửi lại cùng key sẽ được xử lý như mới (giống luật webhook ở M4).
6. Nhiều request cùng key đến **đồng thời** → đúng 1 đơn. Các request còn lại nhận response đã lưu (201), hoặc
   409 `REQUEST_IN_PROGRESS` nếu request đầu chưa xong. Với DB: bảng `idempotency_keys` có
   `UNIQUE(user_id, key)`, chèn dòng "đang xử lý" trước trong transaction, ai chèn được thì người đó xử lý.
7. Không gửi key → hành vi như M2. Key dài quá 255 → 422 (field `Idempotency-Key`).
8. Production nên xoá key cũ sau khoảng 24 giờ (không có test).

**Bài liên quan:** `nc-10` (idempotency key).

---

## 11. M8 · Sự kiện, việc nền, audit log

### Outbox sự kiện

Mọi thay đổi trạng thái quan trọng được ghi thành **sự kiện**, trong **cùng thao tác** (cùng transaction với DB)
với thay đổi dữ liệu. Thao tác lỗi thì không có sự kiện. Đây là mẫu **transactional outbox**: không gửi ra ngoài
ngay trong request, mà ghi vào bảng `outbox`, một worker nền đọc và gửi sau.

```json
{ "id": 42, "type": "order.paid", "data": { "orderId": 12, "status": "paid" }, "createdAt": "..." }
```

| `type` | Khi nào | `data` |
|---|---|---|
| `order.created` | tạo đơn (API hoặc webhook M4) | `orderId`, `status`, `total`, `source` |
| `order.paid`, `order.shipped`, `order.cancelled` | chuyển trạng thái | `orderId`, `status` |
| `stock.low` | tồn kho **vừa** xuống dưới `LOW_STOCK_THRESHOLD` (từ `>= ngưỡng` thành `< ngưỡng`) | `productId`, `sku`, `stock`, `threshold` |

- `id` là số nguyên **tăng dần**. `stock.low` chỉ phát một lần mỗi khi "vượt ngưỡng xuống", giảm tiếp không phát lại;
  nhập hàng lên trên ngưỡng rồi tụt xuống lần nữa thì phát lần nữa.
- `GET /admin/events?after=<id>&limit=` (chỉ admin): các sự kiện có `id > after` (mặc định 0), theo thứ tự tăng,
  `limit` 1–1000 (mặc định 100). Trả `{ "data": [ ... ] }`. Client lưu id cuối cùng đã đọc để đọc tiếp.

### Webhook đi (gửi sự kiện cho hệ thống khác)

`POST /admin/webhook-subscriptions` (chỉ admin), body `{ "url": "https://...", "events": ["order.paid"] }`:

- `url` là địa chỉ http(s) hợp lệ; `events` tuỳ chọn, là mảng các `type` ở bảng trên (bỏ trống = mọi loại). Sai → 422.
- 201 trả `{ id, url, events, secret, createdAt }`. `secret` sinh ngẫu nhiên, chỉ trả lúc tạo.
- Mỗi sự kiện **phát sinh sau khi đăng ký** và khớp `events` được gửi **ở nền** (không làm chậm request gốc):
  `POST <url>` với body là JSON của sự kiện và các header:

  | Header | Giá trị |
  |---|---|
  | `content-type` | `application/json` |
  | `x-event-id` | `id` sự kiện, để bên nhận chống xử lý trùng |
  | `x-event-type` | `type` sự kiện |
  | `x-signature` | hex của HMAC-SHA256(raw body, `secret`) |

- Bên nhận trả 2xx → xong. Trả 5xx hoặc lỗi mạng → **gửi lại** cùng body và `x-event-id`, chờ
  `EVENT_RETRY_BASE_MS × 2^(lần thử − 1)` (exponential backoff), tối đa 5 lần. Trả 4xx → **không** gửi lại.
- Việc gửi là "ít nhất một lần" (at-least-once): bên nhận có thể nhận trùng, nên phải dùng `x-event-id` để bỏ trùng.

### Audit log

`GET /admin/audit-log?page=&perPage=` (chỉ admin) ghi **thao tác thành công của admin**, cũ trước:

```json
{ "id": 3, "actor": { "id": 1, "email": "admin@shop.test" }, "action": "product.update",
  "target": { "type": "product", "id": 5 }, "createdAt": "..." }
```

| `action` | `target.type` |
|---|---|
| `product.create`, `product.update`, `product.delete` | `product` |
| `inventory.adjust` | `product` |
| `order.pay`, `order.ship`, `order.cancel` (admin huỷ) | `order` |
| `webhook_subscription.create` | `webhook_subscription` |

Thao tác của khách hàng và thao tác lỗi không ghi.

### Dừng việc nền

Worker nền (vòng lặp đọc outbox, `setTimeout` chờ gửi lại) phải dừng được: **`closeApp(app)` bắt buộc ở M8**,
huỷ mọi timer và request đang chờ. Nếu không, tiến trình test không thoát được. Gợi ý: gọi `timer.unref()` và giữ
danh sách timer để `clearTimeout` khi đóng. Server chạy thật cũng cần điều này cho graceful shutdown (M5).

**Bài liên quan:** `nc-11` (outbox), `nc-12` (job queue có retry). Khi đi làm, việc nền thường dùng hàng đợi như
BullMQ (Redis) hoặc RabbitMQ thay vì tự viết.
