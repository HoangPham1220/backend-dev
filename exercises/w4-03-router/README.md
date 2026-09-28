# w4-03 · Tự viết router

**Mục tiêu:** tự làm phần "routing" của Express: so khớp method + path, lấy tham số `:sku` từ URL và query string.

## So với PHP

- Magento: URL `/catalog/product/view/id/5` được router của Magento tách thành module/controller/action và
  `getParam('id')`. Laravel: `Route::get('/products/{sku}', ...)`.
- Node thuần không có router. Bài này bạn tự viết một cái nhỏ, sau đó Express sẽ không còn là "phép màu".
- Giá trị trong query string **luôn là chuỗi**: `?page=2` cho `'2'`, không phải `2` (giống `$_GET` của PHP).

## Yêu cầu

Viết `createRouter()` trả về object có:

- `get(path, handler)`, `post(path, handler)`, `put(path, handler)`, `delete(path, handler)`: đăng ký route.
  `path` có thể chứa tham số dạng `:ten`, ví dụ `/products/:sku`, `/orders/:orderId/items/:sku`.
- `handle(req, res)`: tìm route **đầu tiên** khớp `req.method` và path của `req.url`.
  - Khớp: gán `req.params` (object tham số, đã `decodeURIComponent`) và `req.query` (object từ query string,
    không có thì `{}`), gọi `handler(req, res)`, trả về `true`.
  - Không khớp: trả về `false`, không gọi handler nào.

Luật so khớp:

- Số đoạn (segment, phần giữa các dấu `/`) phải bằng nhau: `/products/:sku` **không** khớp `/products`
  hay `/products/CAP/extra`.
- Đoạn tĩnh phải giống hệt; đoạn `:ten` khớp mọi giá trị không rỗng.
- Route đăng ký trước được ưu tiên: đăng ký `/products/new` trước `/products/:sku` thì `/products/new` vào route tĩnh.

```js
const router = createRouter();
router.get('/products/:sku', (req, res) => {
  res.end(`sku=${req.params.sku}, page=${req.query.page}`);
});

http.createServer((req, res) => {
  if (!router.handle(req, res)) {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(3000);
// GET /products/CAP?page=2  ->  "sku=CAP, page=2"
```

## Chạy

```bash
npm run check w4-03
npm run watch w4-03
```

## Trong Express

```js
const router = express.Router();
router.get('/products/:sku', (req, res) => res.json({ sku: req.params.sku, page: req.query.page }));
app.use(router);
```

Express còn hỗ trợ regex, tham số tùy chọn, `router.use()`... nhưng lõi chính là đúng những gì bạn vừa viết.

## Tự kiểm tra sau khi đạt

Vì sao thứ tự đăng ký route quan trọng? Cho ví dụ một bug thật có thể xảy ra nếu đăng ký `/products/:sku`
trước `/products/export`.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Lưu route thành mảng `{ method, segments, handler }` với `segments = path.split('/').filter(Boolean)`.
Tách path và query bằng `new URL(req.url, 'http://localhost')`: có `.pathname` và `.searchParams`
(`Object.fromEntries(url.searchParams)` ra object). So khớp từng segment bằng vòng lặp.

</details>
