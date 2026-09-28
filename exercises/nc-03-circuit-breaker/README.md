# nc-03 · Circuit breaker

**Mục tiêu:** bọc lời gọi tới dịch vụ bên ngoài bằng một "cầu dao": dịch vụ lỗi liên tục thì ngắt, từ chối ngay
thay vì chờ timeout, sau một lúc cho thử lại một request để xem đã hồi phục chưa.

## Vì sao quan trọng khi đi làm

Khi cổng thanh toán hoặc API vận chuyển sập, mỗi request tới đó có thể treo 30 giây. Hàng trăm request cùng treo
làm cạn kết nối, và hệ thống của bạn sập theo (*cascading failure*). Retry (bài w3-04) còn làm tệ hơn vì bắn
thêm request vào dịch vụ đang quá tải. Circuit breaker cắt vòng lặp đó: thất bại nhanh, cho dịch vụ kia thời gian
hồi phục.

Ba trạng thái:

```
          lỗi liên tiếp >= failureThreshold
 closed ─────────────────────────────────────► open
   ▲                                             │ đã qua resetTimeoutMs
   │ request thử thành công                      ▼   (xét ở lần gọi kế tiếp)
   └──────────────────────────────────────── half-open
                     request thử lỗi ──────────► open (đếm lại thời gian)
```

## Yêu cầu

`CircuitOpenError` đã viết sẵn trong `exercise.js`.

### `createCircuitBreaker(fn, { failureThreshold = 5, resetTimeoutMs = 10000, now, onStateChange })`

Trả về object `breaker`:

- `breaker.call(...args)` → Promise. Gọi `await fn(...args)` tùy trạng thái.
- `breaker.state` → `'closed'` | `'open'` | `'half-open'`.
- `onStateChange(from, to)` (tùy chọn) được gọi mỗi lần đổi trạng thái.

Luật:

1. **closed**: gọi `fn`. Thành công → reset bộ đếm lỗi. Lỗi → tăng bộ đếm, ném lại **đúng lỗi gốc**; bộ đếm chạm
   `failureThreshold` (lỗi **liên tiếp**) → chuyển `open`.
2. **open**: chưa đủ `resetTimeoutMs` kể từ lúc mở → reject `CircuitOpenError` ngay, **không** gọi `fn`.
   Đủ thời gian → chuyển `half-open` và xử lý lời gọi này như request thử.
3. **half-open**: chỉ cho **một** request thử chạy. Trong lúc nó chạy, mọi lời gọi khác reject `CircuitOpenError`.
   Thử thành công → `closed` (bộ đếm về 0). Thử lỗi → `open` lại, tính thời gian từ lúc này.

Chuyển `open → half-open` chỉ xảy ra khi có lời gọi mới (không dùng timer), nên `state` có thể vẫn là `'open'` dù
đã quá `resetTimeoutMs`.

```js
let t = 0;
const breaker = createCircuitBreaker(callShippingApi, { failureThreshold: 3, resetTimeoutMs: 1000, now: () => t });
// 3 lần lỗi liên tiếp → breaker.state === 'open'
await breaker.call(order); // reject CircuitOpenError, callShippingApi không được gọi
t = 1000;
await breaker.call(order); // half-open: cho gọi thử
```

## Chạy

```bash
npm run check nc-03
```

## Tự kiểm tra sau khi đạt

Circuit breaker và retry nên xếp thế nào: retry bọc ngoài breaker hay breaker bọc ngoài retry? Khi breaker đang
`open`, API của bạn nên trả gì cho client (status code, message)?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Giữ các biến trong closure: `state`, `failures`, `openedAt`, `trialRunning`. Viết một hàm nhỏ `setState(to)` để
luôn gọi `onStateChange` đúng chỗ. Với half-open, đặt `trialRunning = true` trước khi `await fn(...)`, và nhớ trả
nó về `false` trong `finally`.

</details>

## Đọc thêm

- Thư viện `opossum` (circuit breaker phổ biến cho Node).
- Mẫu thiết kế *Circuit Breaker* của Martin Fowler; *bulkhead*, *timeout*, *fallback* thường đi cùng.
