# w3-06 · Giới hạn số việc chạy song song (bài khó / bonus)

**Mục tiêu:** chạy một danh sách việc async, song song nhưng **không quá `limit` việc cùng lúc**, và giữ đúng thứ tự kết quả.

> Đây là bài khó. Làm sau khi đã đạt w3-01 → w3-05. Kẹt lâu thì bỏ qua, quay lại cuối tuần.

## So với PHP

- PHP ít gặp bài toán này vì mỗi request chạy tuần tự.
- Node dễ bắn cùng lúc hàng nghìn request (`Promise.all` với 5000 sản phẩm). API ngoài sẽ chặn:
  **API Shopify có rate limit**, gửi quá nhanh sẽ nhận lỗi `429 Too Many Requests`.
  Database cũng chỉ có một số kết nối nhất định.
- Giải pháp: chạy song song nhưng có giới hạn, ví dụ tối đa 4 request cùng lúc. Xong một việc thì bắt đầu việc tiếp theo.

## Yêu cầu

### `mapWithLimit(items, limit, asyncFn)`

- Gọi `asyncFn(item)` cho mọi phần tử của `items`.
- Tại mọi thời điểm, **không quá `limit`** lời gọi đang chạy dở. Nhưng cũng phải **tận dụng đủ `limit`**:
  còn việc thì không để chỗ trống.
- Trả về mảng kết quả **theo đúng thứ tự `items`**, giống `Promise.all`.
- Một lời gọi lỗi → `mapWithLimit` reject với lỗi đó.

```js
// 6 sản phẩm, mỗi lần đồng bộ mất 100ms, tối đa 2 việc cùng lúc -> ~300ms
const results = await mapWithLimit(productIds, 2, syncProductToShopify);
```

## Chạy

```bash
npm run check w3-06
```

## Tự kiểm tra sau khi đạt

1. Vì sao cách "chia mảng thành từng nhóm `limit` phần tử, `Promise.all` từng nhóm" lại **chậm hơn** cách của bạn
   khi thời gian mỗi việc không đều nhau?
2. Trong code của bạn, có chỗ nào hai "worker" cùng lấy một phần tử không? Vì sao không xảy ra
   dù chạy "song song"? (Gợi ý: Node chỉ có một luồng chạy JavaScript.)

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Tạo `limit` "worker". Mỗi worker là một hàm async có vòng lặp: lấy chỉ số tiếp theo từ một biến đếm dùng chung,
`await asyncFn(items[i])`, ghi kết quả vào `results[i]`, lặp tới khi hết phần tử.
Chờ tất cả worker xong bằng `Promise.all`.

</details>

<details>
<summary>Đọc thêm sau khi đạt</summary>

Thực tế người ta dùng thư viện có sẵn như `p-limit` hoặc `p-map` trên npm. Tự viết một lần để hiểu cơ chế,
đi làm thì dùng thư viện.

</details>
