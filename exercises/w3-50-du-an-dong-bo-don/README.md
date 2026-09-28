# w3-50 · Dự án: đồng bộ đơn hàng từ API kiểu Shopify

> BÀI TẬP LỚN cuối tuần 3 (4–6 giờ).

**Mục tiêu:** ghép mọi thứ của tuần 3 (fetch, retry, giới hạn song song, xử lý lỗi, ghi file async) thành một
chương trình có cấu trúc nhiều module, giống một job đồng bộ dữ liệu thật.

## Bối cảnh

Bạn cần kéo toàn bộ đơn hàng từ một API kiểu Shopify về máy, lưu ra file để hệ thống khác xử lý. API này:

- **Phân trang:** mỗi lần chỉ trả một trang danh sách id.
- **Rate limit:** gọi nhanh quá thì trả `429 Too Many Requests` kèm header `Retry-After` (số giây phải chờ).
- **Thỉnh thoảng lỗi:** trả `500`/`503` rồi lần sau lại chạy bình thường.
- **Có đơn đã bị xoá:** chi tiết đơn trả `404`.

Job phải chạy hết, không chết giữa chừng vì một đơn lỗi, và báo cáo đơn nào thất bại, vì sao.

## API

| Request | Response 200 |
|---|---|
| `GET {baseUrl}/orders?page=N` (N bắt đầu từ 1) | `{ "orders": [{ "id": 1 }, ...], "nextPage": 2 }`. Trang cuối có `nextPage: null` |
| `GET {baseUrl}/orders/:id` | `{ "id": 1, "total": 350000, "items": [...] }` |

## Cấu trúc code

Code chia thành 4 module trong `lib/` và một hàm điều phối trong `exercise.js`. Test kiểm tra từng module riêng
rồi mới kiểm tra toàn bộ. Nên làm lần lượt theo thứ tự dưới đây, chạy `npm run check w3-50` sau mỗi bước.

### Bước 1. `lib/http.js` → `getJson(url, { maxRetries = 3, baseDelayMs = 50 } = {})`

Class `HttpError` đã viết sẵn. Hàm `getJson`:

- Gọi `fetch(url)`. Status 2xx → trả JSON đã parse.
- `429` → chờ `Retry-After` **giây** (có thể là số thập phân như `0.05`, không có header thì chờ `baseDelayMs`) rồi thử lại.
- `5xx` → chờ theo **exponential backoff** rồi thử lại: `baseDelayMs`, `baseDelayMs * 2`, `baseDelayMs * 4`...
- Mỗi lần thử lại (do 429 hoặc 5xx) tính vào `maxRetries`. Tổng số request tối đa là `1 + maxRetries`.
  Hết lượt → throw `HttpError` với status của lần cuối.
- Status khác (4xx trừ 429) → throw `HttpError` **ngay**, không thử lại. Retry một lỗi 404 là vô ích.

### Bước 2. `lib/paginate.js` → `fetchAllOrderIds(baseUrl, getJsonFn)`

Gọi lần lượt `page=1, 2, ...` bằng `getJsonFn(url)` cho tới khi `nextPage` là `null`. Trả mảng id theo đúng thứ tự.
(`getJsonFn` được truyền vào thay vì import cứng để dễ test và dễ thay đổi.)

### Bước 3. `lib/pool.js` → `mapWithLimit(items, limit, fn)`

Giống bài w3-06: tối đa `limit` việc cùng lúc, kết quả theo thứ tự `items`. Được copy lời giải w3-06 của bạn.

### Bước 4. `lib/writer.js` → `writeJsonLines(filePath, records)`

Dùng `node:fs/promises`. Mỗi record là một dòng `JSON.stringify(record)`, mỗi dòng kết thúc bằng `\n`.
Mảng rỗng → file rỗng.

### Bước 5. `exercise.js` → `syncOrders({ baseUrl, outFile, concurrency = 3, maxRetries = 3 })`

1. Lấy toàn bộ id bằng `fetchAllOrderIds`.
2. Lấy chi tiết từng đơn bằng `getJson`, tối đa `concurrency` request cùng lúc.
3. Đơn nào lỗi (404, hết lượt retry...) thì **không làm hỏng cả job**: ghi vào `failed` dạng
   `{ id, reason }`, với `reason` là `error.message`.
4. Ghi các đơn thành công ra `outFile` bằng `writeJsonLines`, giữ thứ tự id.
5. Trả `{ synced, failed }`, trong đó `synced` là số đơn đã ghi.

```js
const report = await syncOrders({ baseUrl: 'https://shop.example.com/api', outFile: 'orders.jsonl' });
// { synced: 7, failed: [{ id: 5, reason: 'HTTP 404 https://shop.example.com/api/orders/5' }] }
```

## Chạy

```bash
npm run check w3-50
npm run watch w3-50
```

Test tự dựng một server giả trên máy (không cần mạng), mô phỏng phân trang, 429, 500 và 404.

## Tự kiểm tra sau khi đạt

1. Job đang chạy dở thì mất điện. Chạy lại sẽ kéo lại từ đầu. Bạn sẽ sửa thiết kế thế nào để chạy tiếp từ chỗ dừng?
2. Vì sao retry 5xx dùng exponential backoff mà không thử lại ngay? Điều gì xảy ra nếu 1000 client cùng retry ngay lập tức?
3. `concurrency` nên đặt bao nhiêu khi gọi API Shopify thật? Bạn sẽ tìm con số đó ở đâu?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `getJson`: vòng `for (let attempt = 0; ; attempt += 1)`. Trong vòng: `fetch`, nếu `response.ok` thì return;
  nếu status là 429 hoặc >= 500 **và** `attempt < maxRetries` thì tính thời gian chờ, `await delay(...)`, `continue`;
  còn lại throw `new HttpError(response.status, url)`. Header đọc bằng `response.headers.get('retry-after')`.
- `syncOrders`: trong hàm truyền cho `mapWithLimit`, bọc `getJson` bằng `try/catch` và trả về
  `{ ok: true, order }` hoặc `{ ok: false, id, reason }`. Như vậy một đơn lỗi không làm `mapWithLimit` reject.

</details>
