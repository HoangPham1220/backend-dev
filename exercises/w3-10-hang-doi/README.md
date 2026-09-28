# w3-10 · Hàng đợi xử lý tuần tự (TaskQueue)

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** viết một class quản lý các việc async, chạy **lần lượt từng việc một**, mỗi việc trả kết quả riêng cho người gọi.

## Bối cảnh

Nhiều webhook "cập nhật tồn kho" của Shopify tới cùng lúc. Nếu xử lý song song, hai việc cùng đọc tồn kho 10,
cùng trừ 1 rồi cùng ghi 9: mất một lần trừ (race condition). Cách đơn giản nhất: cho vào hàng đợi, xử lý tuần tự.

## So với PHP

Với PHP-FPM, mỗi request là một tiến trình riêng, nên muốn tuần tự phải nhờ database lock hoặc message queue
(như RabbitMQ trong Magento). Với Node, mọi request chạy chung một tiến trình, nên có thể giữ hàng đợi ngay trong bộ nhớ.
(Hàng đợi trong bộ nhớ sẽ mất khi tiến trình khởi động lại. Chạy thật trên production vẫn cần queue bền như Redis/RabbitMQ.)

## Yêu cầu

### `class TaskQueue`

- `add(task)`: `task` là hàm async không tham số. Đưa vào cuối hàng đợi và trả về **Promise kết quả của chính task đó**.
  - Task chạy **lần lượt theo thứ tự add**, không bao giờ có 2 task chạy cùng lúc.
  - Task lỗi → Promise của task đó reject, **hàng đợi vẫn chạy tiếp** các task sau.
- `onIdle()`: trả Promise resolve khi hàng đợi **rỗng và không có task nào đang chạy**. Đang rảnh thì resolve ngay.
- `size` (getter): số task **đang chờ** (không tính task đang chạy).

```js
const queue = new TaskQueue();
const a = queue.add(() => updateStock('CAP', -1));
const b = queue.add(() => updateStock('CAP', -2)); // chỉ chạy sau khi a xong
await b;                 // kết quả của task b
await queue.onIdle();    // mọi task đã xong
```

## Chạy

```bash
npm run check w3-10
```

## Tự kiểm tra sau khi đạt

Nếu thêm tham số `concurrency` (cho phép chạy tối đa N task cùng lúc), bạn phải sửa những chỗ nào?
So sánh với `mapWithLimit` ở bài w3-06.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Lưu một mảng các "việc chờ", mỗi phần tử gồm `{ task, resolve, reject }`. `add` tạo `new Promise((resolve, reject) => ...)`,
đẩy vào mảng rồi gọi một hàm nội bộ kiểu `#next()`. `#next()` chỉ chạy khi không có task nào đang chạy:
lấy phần tử đầu, `await` task trong `try/catch`, gọi `resolve`/`reject`, rồi gọi lại `#next()`.
`onIdle` có thể giữ danh sách các `resolve` đang chờ và gọi hết khi hàng đợi rảnh.

</details>
