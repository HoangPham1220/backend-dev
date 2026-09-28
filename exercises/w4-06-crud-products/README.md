# w4-06 · API CRUD sản phẩm

> BÀI TẬP LỚN cuối tuần 4 — khởi động cho dự án lớn.

**Mục tiêu:** ghép router, đọc body, middleware và xử lý lỗi (w4-01 → w4-05) thành một API REST hoàn chỉnh,
đúng status code, đúng định dạng lỗi.

## Chuẩn bị

Copy code **của bạn** từ các bài trước vào thư mục `lib/` của bài này rồi import vào `exercise.js`, ví dụ:

```
lib/read-json-body.js   <- w4-02
lib/router.js           <- w4-03
lib/errors.js           <- w4-05 (HttpError, NotFoundError, ValidationError, errorHandler)
```

Không bắt buộc cấu trúc này, test chỉ gọi `createApp()` qua HTTP. Tách file hợp lý là một phần của bài.

## Yêu cầu

`createApp()` trả về một `http.Server` (chưa `listen`). Dữ liệu lưu **trong bộ nhớ**; mỗi lần gọi `createApp()`
là một kho **trống, riêng biệt** (không dùng biến toàn cục của module để chứa sản phẩm).

Sản phẩm có dạng `{ sku, name, price, stock }`.

### Endpoint

| Method, path | Thành công | Lỗi |
|---|---|---|
| `GET /products` | 200, danh sách có phân trang (xem dưới) | 422 nếu `page`/`perPage` sai |
| `GET /products/:sku` | 200, sản phẩm | 404 |
| `POST /products` | **201**, sản phẩm vừa tạo, header `Location: /products/<sku>` | 400 JSON hỏng, 422 validation, **409** trùng sku |
| `PUT /products/:sku` | 200, sản phẩm sau khi cập nhật | 404, 400, 422 |
| `DELETE /products/:sku` | **204**, body rỗng | 404 |
| Route khác | | 404 |

### Validation (POST và PUT)

Body phải là object JSON (mảng, số, chuỗi... → 400). Kiểm tra **mọi** field rồi mới báo lỗi, gom vào
`details` dạng `{ tênField: 'lý do' }` (lý do tự viết):

- `sku` (chỉ POST): bắt buộc, chuỗi khớp `/^[A-Z0-9-]{2,32}$/`. Với PUT, sku lấy từ URL, bỏ qua `sku` trong body.
- `name`: bắt buộc, chuỗi, sau khi `trim()` không rỗng. Lưu bản đã trim.
- `price`: bắt buộc, số nguyên `>= 0` (VND).
- `stock`: không bắt buộc, mặc định `0`; nếu có phải là số nguyên `>= 0`.
- Field lạ trong body bị bỏ qua, không lưu.

### Danh sách và phân trang

`GET /products?q=áo&page=2&perPage=5`

- `q`: lọc sản phẩm có `name` chứa `q`, không phân biệt hoa thường.
- `page` mặc định 1, `perPage` mặc định 10, tối đa 100. Không phải số nguyên dương, hoặc `perPage > 100` → 422.
- Thứ tự: theo thứ tự tạo.
- Response:

```json
{
  "data": [ { "sku": "CAP", "name": "Mũ lưỡi trai", "price": 80000, "stock": 5 } ],
  "meta": { "page": 2, "perPage": 5, "total": 7, "totalPages": 2 }
}
```

### Định dạng lỗi

Như w4-05: `{ "error": { "code", "message", "details" } }`. Mọi response (trừ 204) là JSON.

## Chạy

```bash
npm run check w4-06
npm run watch w4-06
```

Thử tay: tạo `run.js` gồm `import { createApp } from './exercise.js'; createApp().listen(3000);`, rồi dùng `curl`:

```bash
curl -i -X POST localhost:3000/products -H 'Content-Type: application/json' \
  -d '{"sku":"CAP","name":"Mũ lưỡi trai","price":80000,"stock":5}'
```

## Trong Express

Cùng API này viết bằng Express chỉ khoảng 60 dòng: `express.json()` thay `readJsonBody`, `express.Router()`
thay router của bạn, `app.use((err, req, res, next) => ...)` thay `errorHandler`. Tuần sau bạn chuyển dự án lớn
sang Express, và sẽ biết chính xác từng dòng Express đang làm gì hộ bạn.

## Tự kiểm tra sau khi đạt

1. Vì sao tạo mới trả 201 chứ không phải 200, và vì sao DELETE trả 204?
2. 400 khác 422 thế nào trong API của bạn?
3. Nếu hai request `POST /products` cùng sku đến gần như cùng lúc, code của bạn có thể tạo trùng không? Vì sao?
   (Gợi ý: Node chạy một luồng; nghĩ xem giữa lúc kiểm tra trùng và lúc lưu có `await` nào không.)

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Trong `createApp()`: tạo `const products = new Map()` (giữ thứ tự thêm vào), tạo router, đăng ký 5 route,
rồi `http.createServer(async (req, res) => { try { ...router.handle... } catch (err) { errorHandler(err, req, res) } })`.
Handler nên là `async` và `await readJsonBody(req)`, nên router phải trả về/`await` được Promise của handler.
Viết riêng hàm `validateProduct(body, { requireSku })` trả về object `details` (rỗng nghĩa là hợp lệ).

</details>
