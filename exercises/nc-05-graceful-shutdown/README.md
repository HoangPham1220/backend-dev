# nc-05 · Graceful shutdown

**Mục tiêu:** tắt server mà không làm hỏng request đang xử lý: báo "không sẵn sàng" để load balancer ngừng gửi
traffic, ngừng nhận kết nối mới, chờ request dở dang xong, quá hạn thì đóng cưỡng bức.

## Vì sao quan trọng khi đi làm

Mỗi lần deploy, Docker/Kubernetes gửi `SIGTERM` cho process cũ, chờ một khoảng (mặc định 30 giây trên Kubernetes)
rồi mới `SIGKILL`. Nếu Node thoát ngay khi nhận `SIGTERM`, request đang tạo đơn hàng bị cắt giữa chừng: khách thấy
lỗi, có thể đã trừ tồn kho mà chưa ghi đơn. Quy trình chuẩn:

1. Nhận `SIGTERM` → endpoint readiness (`/ready`) trả `503` để load balancer rút pod khỏi danh sách.
2. Chờ một chút (`readinessDelayMs`) cho load balancer kịp cập nhật; trong lúc này vẫn phục vụ request bình thường.
3. `server.close()`: ngừng nhận kết nối mới, đóng các kết nối keep-alive đang rảnh.
4. Chờ request đang chạy xong. Quá `shutdownTimeoutMs` → đóng mọi kết nối còn lại.
5. Đóng database, thoát process.

PHP-FPM lo việc này hộ bạn (`process_control_timeout`); ở Node bạn tự làm.

## Yêu cầu

### `createGracefulServer(handler, { shutdownTimeoutMs = 10000, readinessDelayMs = 0 })`

Trả `{ server, shutdown, isShuttingDown }`:

- `server`: một `http.Server` (chưa `listen`, người gọi tự `listen`).
  - `GET /ready` do server tự xử lý: `200 {"ready":true}`, hoặc `503 {"ready":false}` khi đang tắt.
    Không tính là request đang chạy.
  - Mọi request khác chuyển cho `handler(req, res)`. Đang tắt thì đặt thêm header `Connection: close`.
- `isShuttingDown` (getter): `true` ngay khi `shutdown()` được gọi.
- `shutdown()` → Promise `{ drained }`:
  - Chạy đúng quy trình bước 1–4 ở trên.
  - `drained: true` nếu mọi request xong trước hạn, `false` nếu phải đóng cưỡng bức.
  - Chỉ resolve khi server đã đóng hẳn (callback của `server.close`).
  - Gọi nhiều lần trả về **cùng một Promise**.

Một request được tính là "đang chạy" từ lúc vào `handler` tới khi response phát sự kiện `close`.

## Chạy

```bash
npm run check nc-05
```

Khi dùng thật:

```js
const app = createGracefulServer(handler, { shutdownTimeoutMs: 20_000, readinessDelayMs: 5_000 });
app.server.listen(3000);
process.on('SIGTERM', async () => {
  const { drained } = await app.shutdown();
  await db.close();
  process.exit(drained ? 0 : 1);
});
```

## Tự kiểm tra sau khi đạt

Vì sao cần bước chờ `readinessDelayMs` thay vì `server.close()` ngay? `shutdownTimeoutMs` nên nhỏ hơn hay lớn hơn
`terminationGracePeriodSeconds` của Kubernetes?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Đếm request đang chạy: tăng khi vào handler, giảm trong `res.on('close')`. Khi bộ đếm về 0 thì gọi các hàm đang
chờ. `Promise.race` giữa "đã hết request" và một `setTimeout(shutdownTimeoutMs)`. Tham khảo
`server.closeIdleConnections()` và `server.closeAllConnections()` (Node 18.2+). Nhớ `clearTimeout`.

</details>

## Đọc thêm

- Kubernetes: *Pod termination*, `preStop` hook, readiness vs liveness probe.
- Thư viện `http-terminator`, `@godaddy/terminus`.
