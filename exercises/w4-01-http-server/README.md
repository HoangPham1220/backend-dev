# w4-01 · HTTP server đầu tiên với `node:http`

**Mục tiêu:** tự dựng một HTTP server trả JSON, hiểu request/response, status code 200/404/405.

## So với PHP

- PHP-FPM: mỗi request chạy file PHP từ đầu trong một process, xong là xoá sạch biến.
- Node: **một server sống lâu** nhận mọi request. Biến khai báo ngoài hàm xử lý được **dùng chung giữa các request**
  (tiện làm cache, nhưng cũng dễ lộ dữ liệu người này sang người khác).
- Không có Apache/Nginx "tự tìm file": bạn tự đọc `req.method`, `req.url` rồi quyết định trả gì (tự làm routing).

## Yêu cầu

Viết `createServer()` trả về một `http.Server` (dùng `http.createServer` từ `node:http`). **Không gọi `listen`**:
test sẽ tự `listen` trên cổng ngẫu nhiên.

| Request | Status | Body (JSON) |
|---|---|---|
| `GET /health` | 200 | `{ "status": "ok" }` |
| `GET /products` | 200 | mảng `PRODUCTS` có sẵn trong file khung |
| `POST /health`, `DELETE /products`... (route có, method sai) | 405 | `{ "error": "Method Not Allowed" }` |
| Route khác (`/abc`...) | 404 | `{ "error": "Not Found" }` |

- Mọi response có header `Content-Type: application/json`.
- Response 405 có thêm header `Allow` liệt kê method hợp lệ, ví dụ `Allow: GET`.
- `/products?page=2` vẫn là route `/products`: bỏ phần query string trước khi so khớp.

```js
import { createServer } from './exercise.js';
createServer().listen(3000);
// curl -i http://localhost:3000/health
```

## Chạy

```bash
npm run check w4-01     # chấm một lần
npm run watch w4-01     # tự chấm lại mỗi lần lưu file
```

Thử tay: tạo file `run.js` như ví dụ trên, `node run.js`, rồi `curl -i http://localhost:3000/products`.

## Trong Express

```js
const app = express();
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/products', (req, res) => res.json(PRODUCTS));
// 404 Express tự trả (dạng HTML); 405 Express KHÔNG tự trả, phải tự viết.
```

Express làm hộ: tách query string, `res.json()` (đặt header + `JSON.stringify`), 404 mặc định.

## Tự kiểm tra sau khi đạt

Nếu thêm biến `let requestCount = 0` ở ngoài `createServer` và tăng mỗi request, giá trị sẽ ra sao sau 3 request
từ 3 người khác nhau? Trong PHP-FPM thì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết một hàm nhỏ `sendJson(res, status, body, headers = {})` dùng `res.writeHead` và `res.end(JSON.stringify(body))`.
Lấy path bằng `new URL(req.url, 'http://localhost').pathname`. Xử lý theo thứ tự: path có tồn tại không → method có
đúng không.

</details>
