# w3-05 · Giới hạn thời gian chờ (timeout)

**Mục tiêu:** dùng `Promise.race` để "đua" giữa việc thật và một đồng hồ hẹn giờ.

## So với PHP

- PHP: đặt timeout bằng tùy chọn của curl/Guzzle (`CURLOPT_TIMEOUT`), hoặc `max_execution_time` cho cả request.
- Node: không có giới hạn thời gian chung cho request. Một API ngoài bị treo thì `await` sẽ chờ **mãi mãi**
  nếu bạn không tự đặt timeout. Khách hàng thấy trang quay vòng không bao giờ xong.
- `Promise.race([p1, p2])` trả về Promise xong (resolve hoặc reject) **trước tiên** trong các Promise truyền vào.

## Yêu cầu

### `withTimeout(promise, ms)`

- `promise` xong trước `ms` mili giây → trả kết quả của nó (resolve với cùng giá trị).
- `promise` reject trước `ms` → reject với **đúng lỗi gốc** đó.
- Quá `ms` mà `promise` chưa xong → reject với `new Error('Timeout sau <ms>ms')`, ví dụ `'Timeout sau 100ms'`.

```js
await withTimeout(fetchOrder(1), 2000);      // trả đơn hàng nếu API trả lời trong 2 giây
await withTimeout(slowPaymentApi(), 100);    // throw Error('Timeout sau 100ms')
```

## Chạy

```bash
npm run check w3-05
```

## Tự kiểm tra sau khi đạt

1. Khi `withTimeout` đã reject vì hết giờ, `promise` gốc (ví dụ request gọi API) **có bị huỷ không**?
   Nó còn chạy tiếp không? Hậu quả với một API tạo đơn hàng là gì?
2. Khi `promise` xong sớm, cái `setTimeout` bạn tạo ra có còn "treo" không? Làm sao dọn nó bằng `clearTimeout`?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Tạo một Promise thứ hai chỉ để reject sau `ms` mili giây (dùng `setTimeout` bên trong `new Promise`).
Đưa cả hai vào `Promise.race`.

</details>

<details>
<summary>Đọc thêm sau khi đạt</summary>

Muốn thật sự **huỷ** việc đang chạy (ví dụ huỷ request `fetch`), Node dùng `AbortController` và
`AbortSignal.timeout(ms)`: `fetch(url, { signal: AbortSignal.timeout(2000) })`.
Xem trang AbortController trên MDN. Bài w3-07 dùng `fetch`, có thể thử áp dụng.

</details>
