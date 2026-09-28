# nc-06 · Worker threads: đưa việc nặng CPU ra khỏi event loop

**Mục tiêu:** chạy việc tính toán nặng trong `worker_threads` để server vẫn phản hồi request khác, và dựng một pool
worker có hàng đợi.

## Vì sao quan trọng khi đi làm

Node chỉ có **một luồng chạy JavaScript**. Một vòng lặp tính toán 2 giây (tạo file Excel báo cáo, resize ảnh sản phẩm,
băm mật khẩu hàng loạt, parse file import 100MB) làm **mọi** request khác đứng im 2 giây, kể cả `/health`, và
Kubernetes có thể tưởng pod đã chết. PHP-FPM không gặp chuyện này vì mỗi request một process.

`worker_threads` chạy JavaScript trên luồng khác, trao đổi với luồng chính bằng message. Tạo worker tốn chi phí
(vài chục ms, vài MB RAM), nên thực tế dùng **pool** worker tái sử dụng.

## Yêu cầu

`worker.js` đã viết sẵn, đọc comment đầu file để biết giao thức message.

### 1. `runInWorker(file, data)` → Promise

- Tạo `new Worker(file)`, gửi `data` bằng `postMessage`, chờ **một** message trả lời.
- `{ ok: true, result }` → resolve `result`. `{ ok: false, error }` → reject `new Error(error)`.
- Worker phát `error`, hoặc thoát (`exit`) với code khác 0 trước khi trả lời → reject (message chứa chữ `exit`
  và exit code).
- Luôn `terminate()` worker khi xong, dù thành công hay lỗi.

### 2. `createWorkerPool(file, size)` → `{ run(data), close() }`

- Tạo sẵn `size` worker, **tái sử dụng** chúng (không tạo worker mới cho mỗi việc).
- `run(data)` → Promise, xử lý kết quả giống `runInWorker`. Hết worker rảnh → xếp hàng, có worker rảnh thì giao việc
  kế tiếp theo thứ tự gọi.
- Worker chết giữa chừng (`exit` code khác 0) → reject việc nó đang làm, **thay** bằng worker mới, pool vẫn chạy tiếp.
- `close()` → Promise: terminate mọi worker; việc đang xếp hàng reject `Error` có message chứa `Pool đã đóng`;
  `run()` sau khi đóng cũng reject như vậy.

```js
const pool = createWorkerPool(new URL('./worker.js', import.meta.url), 2);
const results = await Promise.all(skus.map((sku) => pool.run({ input: sku, rounds: 50_000 })));
await pool.close();
```

## Chạy

```bash
npm run check nc-06
```

## Tự kiểm tra sau khi đạt

Việc đọc file hoặc gọi database có nên đưa vào worker không, vì sao? Nếu máy có 4 CPU thì pool nên có bao nhiêu
worker? Truyền một object 50MB qua `postMessage` tốn gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Dùng `worker.once('message')`, `worker.once('error')`, `worker.once('exit')` và một cờ `settled` để chỉ
resolve/reject một lần. Với pool: mảng worker rảnh + mảng việc chờ `{ data, resolve, reject }`. Viết hàm `dispatch()`
chạy mỗi khi có việc mới hoặc có worker vừa rảnh. Khi worker `exit` bất thường, gỡ listener cũ, tạo worker mới
rồi `dispatch()`.

</details>

## Đọc thêm

- Thư viện `piscina` (worker pool dùng nhiều trong production).
- *Don't block the event loop* trong tài liệu Node.js; `SharedArrayBuffer`, `transferList` để truyền dữ liệu lớn.
