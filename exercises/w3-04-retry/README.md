# w3-04 · Thử lại khi lỗi (retry)

**Mục tiêu:** viết một hàm bọc (wrapper) nhận vào một hàm async, gọi lại khi lỗi, kết hợp vòng lặp + `await` + `try/catch`.

## So với PHP

- Ý tưởng giống PHP: vòng lặp, `try/catch`, đếm số lần thử. Khác biệt nằm ở chỗ chờ giữa các lần thử:
  PHP dùng `sleep()` / `usleep()` **chặn** cả tiến trình; Node dùng `await delay(ms)` **không chặn**,
  trong lúc chờ event loop vẫn phục vụ request khác.
- Trong Node, hàm cũng là giá trị: truyền `fn` vào như tham số rồi gọi `await fn()`.
  Tương tự `callable` trong PHP.

Retry dùng nhiều khi gọi API ngoài: API Shopify thỉnh thoảng trả lỗi 429/503, thử lại sau một lúc là được.

## Yêu cầu

### `withRetry(fn, { retries = 3, delayMs = 0 } = {})`

- `fn` là hàm async không tham số.
- Gọi `fn()`. Thành công thì trả kết quả luôn.
- Lỗi thì thử lại, **tối đa `retries` lần nữa** (tổng cộng tối đa `1 + retries` lần gọi).
- Giữa hai lần gọi, chờ `delayMs` mili giây.
- Hết lượt mà vẫn lỗi thì **ném (throw) lỗi của lần gọi cuối cùng**.

```js
// Lỗi 2 lần đầu, lần 3 thành công
await withRetry(callShopifyApi, { retries: 3 }); // trả kết quả của lần 3

// Luôn lỗi, retries: 2 -> gọi 3 lần rồi throw lỗi của lần thứ 3
await withRetry(alwaysFail, { retries: 2 });
```

Tham số thứ hai dùng **destructuring kèm giá trị mặc định**, có thể bỏ trống: `withRetry(fn)` nghĩa là `retries = 3`, `delayMs = 0`.

## Chạy

```bash
npm run check w3-04
```

## Tự kiểm tra sau khi đạt

1. Nếu API trả lỗi 400 (dữ liệu gửi lên sai) thì có nên retry không? Còn lỗi 503?
   Bạn sẽ sửa `withRetry` thế nào để chỉ retry một số loại lỗi?
2. "Exponential backoff" là gì? (chờ 100ms, 200ms, 400ms...). Vì sao nó tốt hơn chờ cố định?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Vòng `for` chạy từ lần 0 tới lần `retries`. Trong mỗi vòng: `try { return await fn(); } catch (error) { ... }`.
Nhớ lưu `error` vào một biến ngoài vòng lặp để throw sau khi vòng lặp kết thúc.
Chỉ chờ `delayMs` khi **còn** lần thử tiếp theo.

</details>
