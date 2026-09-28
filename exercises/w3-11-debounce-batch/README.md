# w3-11 · Gom lô (batching) theo số lượng và thời gian

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** kết hợp `setTimeout`, `clearTimeout` và Promise để gom nhiều yêu cầu lẻ thành một lần xử lý.

## Bối cảnh

Mỗi đơn hàng mới cần cập nhật tồn kho lên Shopify. Gọi API cho từng đơn rất tốn lượt, dễ dính rate limit.
Shopify cho phép cập nhật nhiều sản phẩm trong một request. Vậy nên ta **gom** các cập nhật lại rồi gửi một lần:
khi gom **đủ `maxSize`** item, hoặc khi đã chờ **`maxWaitMs`** kể từ item đầu tiên của lô, tuỳ điều kiện nào tới trước.

## Yêu cầu

### `createBatcher(flushFn, { maxSize, maxWaitMs })`

Trả về object `{ add(item) }`.

- `flushFn(items)` là hàm async nhận **mảng item của một lô**.
- `add(item)` đưa item vào lô hiện tại, trả về **Promise**:
  - resolve với **kết quả của `flushFn`** cho lô chứa item đó;
  - reject với lỗi của `flushFn` nếu lô đó lỗi.
- Lô được flush khi:
  - số item đạt `maxSize`: flush **ngay**, không chờ hết giờ;
  - hoặc sau `maxWaitMs` tính từ **item đầu tiên** của lô.
- Sau khi flush, item tiếp theo bắt đầu **lô mới** với đồng hồ mới.

```js
const batcher = createBatcher(updateInventoryOnShopify, { maxSize: 50, maxWaitMs: 200 });
await batcher.add({ sku: 'CAP', delta: -1 }); // chờ tới khi lô chứa nó được gửi
```

## Chạy

```bash
npm run check w3-11
```

## Tự kiểm tra sau khi đạt

1. Nếu quên `clearTimeout` khi lô đã flush vì đủ `maxSize`, chuyện gì xảy ra với lô tiếp theo?
2. Khi tiến trình Node tắt đột ngột, các item đang nằm trong lô chưa flush thì sao? Bạn xử lý thế nào ở production?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Giữ một biến `batch` là mảng các `{ item, resolve, reject }` và một biến `timer`.
`add` tạo Promise, đẩy vào `batch`; nếu đây là item đầu tiên thì đặt `timer = setTimeout(flush, maxWaitMs)`;
nếu `batch.length === maxSize` thì gọi `flush()` ngay.
`flush` lấy lô hiện tại ra (rồi gán `batch = []` ngay, trước khi `await`), `clearTimeout(timer)`,
gọi `flushFn` với các item, rồi resolve/reject từng phần tử của lô đó.

</details>
