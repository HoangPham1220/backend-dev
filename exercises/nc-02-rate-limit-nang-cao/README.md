# nc-02 · Rate limit nâng cao: token bucket và sliding window

**Mục tiêu:** cài hai thuật toán giới hạn tần suất dùng trong thực tế, hiểu vì sao fixed window (bài w8-04) chưa đủ.

## Vì sao quan trọng khi đi làm

- API của bạn cần chặn client gọi quá nhiều (chống brute-force đăng nhập, chống cào dữ liệu).
- Bạn cũng phải **tuân thủ** giới hạn của API khác: Shopify Admin API dùng đúng thuật toán *leaky/token bucket*
  (mỗi app có một "xô" request, xô tự đầy lại theo thời gian).

So sánh ba cách:

| Thuật toán | Cách đếm | Ưu | Nhược |
|---|---|---|---|
| Fixed window (w8-04) | Đếm trong khung cố định 0–60s, 60–120s… | Đơn giản, ít bộ nhớ | Cho **burst gấp đôi** ở ranh giới: cuối khung này + đầu khung sau |
| Sliding window log | Lưu thời điểm mỗi request trong `windowMs` gần nhất | Chính xác | Tốn bộ nhớ theo số request |
| Token bucket | Xô có `capacity` token, tự nạp `refillPerSec` token/giây, mỗi request lấy token | Cho phép burst có kiểm soát, rất ít bộ nhớ | Khó giải thích với khách hơn |

## Yêu cầu

Cả hai hàm nhận `now` (hàm trả ms hiện tại) để test không phải chờ thật. Mỗi `key` (IP, user id, API key) có bộ đếm
riêng. Kết quả luôn có dạng `{ allowed, remaining, retryAfterMs }`.

### 1. `createTokenBucket({ capacity, refillPerSec, now })` → `{ take(key, cost = 1) }`

- Xô mới luôn **đầy** (`capacity` token).
- Token nạp liên tục theo thời gian: sau `ms` mili giây có thêm `ms / 1000 * refillPerSec` token, không vượt `capacity`.
- Đủ token → trừ `cost`, `allowed: true`, `retryAfterMs: 0`.
- Không đủ → không trừ gì, `allowed: false`, `retryAfterMs` = số ms (làm tròn lên) cần chờ để đủ `cost` token.
- `remaining` = số token nguyên còn lại sau lần gọi (`Math.floor`).
- `cost > capacity` → `RangeError` (không bao giờ đủ token).

```js
let t = 0;
const bucket = createTokenBucket({ capacity: 5, refillPerSec: 2, now: () => t });
// 5 lần take('ip1') liên tiếp: allowed, remaining 4, 3, 2, 1, 0
bucket.take('ip1'); // { allowed: false, remaining: 0, retryAfterMs: 500 }
t = 500;
bucket.take('ip1'); // { allowed: true, remaining: 0, retryAfterMs: 0 }
```

### 2. `createSlidingWindowLog({ windowMs, max, now })` → `{ hit(key) }`

- Tính các request **được chấp nhận** có thời điểm `ts > now - windowMs`.
- Ít hơn `max` → ghi lại `now`, `allowed: true`, `remaining` = số lượt còn lại.
- Đủ `max` → `allowed: false`, `remaining: 0`, `retryAfterMs` = lúc request cũ nhất trong cửa sổ hết tác dụng
  (`oldest + windowMs - now`).
- Request bị từ chối **không** được ghi lại (nếu không, client spam sẽ bị khóa mãi).
- Dọn các thời điểm cũ để bộ nhớ không phình mãi.

## Chạy

```bash
npm run check nc-02
```

## Tự kiểm tra sau khi đạt

Với `max: 100` mỗi phút, fixed window cho phép tối đa bao nhiêu request trong 2 giây quanh ranh giới phút?
Sliding window thì sao? Khi chạy nhiều instance Node sau load balancer, bộ đếm trong bộ nhớ này có còn đúng không?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Token bucket không cần timer: lưu `{ tokens, updatedAt }` cho mỗi key, mỗi lần `take` thì nạp bù theo
`now() - updatedAt` rồi mới kiểm tra. Sliding window: mỗi key một mảng thời điểm tăng dần, xóa phần tử đầu
khi nó đã ra khỏi cửa sổ.

</details>

## Đọc thêm

- Shopify API rate limits (leaky bucket), header `Retry-After` và `X-Shopify-Shop-Api-Call-Limit`.
- `express-rate-limit`, `rate-limiter-flexible` (hỗ trợ Redis để dùng chung bộ đếm giữa nhiều instance).
