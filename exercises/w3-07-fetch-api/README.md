# w3-07 · Gọi API bằng `fetch`

**Mục tiêu:** gọi HTTP API bằng `fetch` có sẵn trong Node, đọc JSON, xử lý status code lỗi.

## So với PHP

- PHP: `file_get_contents($url)` hoặc Guzzle `$client->get($url)` chạy **chặn** tới khi có phản hồi.
- Node: `fetch(url)` trả về Promise. Có **hai bước** `await`:
  1. `const response = await fetch(url)`: nhận status và header.
  2. `const data = await response.json()`: đọc và parse phần body JSON (giống `json_decode`).
- **Bẫy lớn:** `fetch` **không throw** khi server trả 404 hay 500. Nó chỉ throw khi lỗi mạng (không kết nối được).
  Bạn phải tự kiểm tra `response.ok` (true khi status 200–299) hoặc `response.status`.
  Khác Guzzle, mặc định Guzzle throw exception với 4xx/5xx.

## Yêu cầu

Test sẽ dựng một server giả trên máy (không cần mạng). `baseUrl` có dạng `http://127.0.0.1:12345`.

### 1. `fetchOrders(baseUrl)`

- Gọi `GET ${baseUrl}/orders`, trả về mảng đơn hàng trong body JSON.
- Status không phải 2xx → throw `Error`, message **chứa status code**, ví dụ `'Lỗi API: 500'`.

### 2. `fetchOrderTotal(baseUrl, id)`

- Gọi `GET ${baseUrl}/orders/${id}`. Body có dạng:

```json
{ "id": 1, "items": [{ "sku": "TSHIRT-M", "price": 150000, "quantity": 2 }, { "sku": "CAP", "price": 80000, "quantity": 1 }] }
```

- Trả về tổng tiền `price * quantity` của mọi item. Ví dụ trên: `380000`.
- Status không phải 2xx (ví dụ 404 khi không có đơn) → throw `Error`, message chứa status code.

```js
await fetchOrders('http://127.0.0.1:12345');         // [{ id: 1, ... }, { id: 2, ... }]
await fetchOrderTotal('http://127.0.0.1:12345', 1);  // 380000
await fetchOrderTotal('http://127.0.0.1:12345', 999); // throw Error('Lỗi API: 404')
```

## Chạy

```bash
npm run check w3-07
```

## Tự kiểm tra sau khi đạt

1. Cả hai hàm đều lặp lại đoạn "gọi fetch, kiểm tra ok, đọc json". Tách thành một hàm `getJson(url)` dùng chung.
2. Nếu server trả 200 nhưng body không phải JSON hợp lệ thì chuyện gì xảy ra ở `response.json()`?
3. Kết hợp với bài w3-05: làm sao để `fetchOrders` không chờ quá 2 giây?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Thứ tự: `await fetch(...)` → `if (!response.ok) throw new Error(...)` với `response.status` →
`await response.json()`. Tính tổng bằng `reduce` trên `items`.

</details>
