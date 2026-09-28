# w4-04 · Middleware và `next()`

**Mục tiêu:** hiểu chuỗi middleware kiểu Express: mỗi hàm làm một việc rồi gọi `next()` để chuyển tiếp,
lỗi thì nhảy thẳng tới hàm xử lý lỗi.

## So với PHP

- Magento có plugin (before/around/after) và observer; Laravel có middleware với `$next($request)`.
  Ý tưởng giống nhau: bọc xử lý chính bằng các lớp phụ (log, xác thực, gắn id...).
- Khác biệt ở Express: middleware **không trả về response**, mà ghi thẳng vào `res`, và báo lỗi bằng `next(err)`.

## Yêu cầu

### 1. `compose(middlewares)`

Nhận mảng middleware, trả về hàm `(req, res) => Promise`. Có hai loại middleware, phân biệt bằng **số tham số**
(`fn.length`), giống Express:

- Middleware thường: `(req, res, next)`.
- Middleware xử lý lỗi: `(err, req, res, next)`, tức 4 tham số.

Luật:

1. Chạy middleware thường theo thứ tự mảng. Chỉ chạy cái tiếp theo khi cái hiện tại gọi `next()`.
   Không gọi `next()` thì dừng chuỗi.
2. `next(err)`, hoặc middleware `throw`, hoặc middleware async bị reject → **bỏ qua** các middleware thường phía sau,
   nhảy tới middleware xử lý lỗi kế tiếp, truyền `err` vào.
3. Trong middleware xử lý lỗi, gọi `next(err)` thì chuyển lỗi tới middleware xử lý lỗi kế tiếp.
4. Lỗi đi hết mảng mà không có ai xử lý → Promise mà hàm compose trả về bị reject với chính lỗi đó.
5. `next()` trả về Promise để middleware async có thể `await next()`.
   Promise của hàm compose chỉ resolve khi chuỗi chạy xong.

### 2. `requestId()`

Trả về middleware: lấy header `x-request-id` của request nếu có, không có thì tạo mới bằng `crypto.randomUUID()`.
Gán vào `req.id`, đặt header response `x-request-id` (`res.setHeader`), rồi `next()`.

### 3. `logger(logFn)`

Trả về middleware: khi response **đã gửi xong** (sự kiện `res.on('finish', ...)`), gọi `logFn` với chuỗi dạng
`GET /products 200 12ms` (method, url, status code, số mili giây từ lúc bắt đầu). Gọi `next()` ngay.

```js
const app = compose([
  requestId(),
  logger(console.log),
  (req, res, next) => { if (req.url === '/boom') throw new Error('hỏng'); next(); },
  (req, res) => { res.end('OK'); },
  (err, req, res, next) => { res.statusCode = 500; res.end('Lỗi rồi'); },
]);
http.createServer((req, res) => app(req, res)).listen(3000);
```

## Chạy

```bash
npm run check w4-04
npm run watch w4-04
```

## Trong Express

```js
app.use((req, res, next) => { req.id = randomUUID(); res.setHeader('x-request-id', req.id); next(); });
app.get('/products', handler);
app.use((err, req, res, next) => res.status(500).json({ error: 'Internal' })); // 4 tham số = error handler
```

Express 5 bắt được lỗi của middleware async bị reject giống luật 2. Express 4 thì **không**: lỗi async
phải tự `next(err)`. Đây là nguồn bug phổ biến khi đọc code cũ.

## Tự kiểm tra sau khi đạt

Vì sao `logger` phải chờ sự kiện `finish` mà không ghi log ngay khi được gọi? Nếu ghi ngay thì dòng log thiếu gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết hàm đệ quy `async function dispatch(index, err)`: lấy `middlewares[index]`; hết mảng thì nếu có `err` thì
`throw err`. Có `err` thì bỏ qua middleware có `length < 4`; không có `err` thì bỏ qua middleware `length === 4`.
Hàm `next` truyền vào middleware là `(nextErr) => dispatch(index + 1, nextErr)`. Bọc lời gọi middleware bằng
`try { await fn(...) } catch (e) { return dispatch(index + 1, e) }`.

</details>
