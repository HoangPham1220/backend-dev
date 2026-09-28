# w3-12 · Cache bất đồng bộ, chống gọi trùng

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** cache **Promise** thay vì cache giá trị, để nhiều lời gọi đồng thời cùng key chỉ tốn một lần gọi thật.

## Bối cảnh

Trang sản phẩm "CAP" bị 100 người mở cùng lúc. Nếu cache chỉ lưu **giá trị sau khi có**, cả 100 request đều thấy
"chưa có trong cache" và cùng gọi database/API. Hiện tượng này gọi là *cache stampede*. Cách chữa: lưu ngay **Promise đang chạy**
vào cache, các request sau `await` chung Promise đó.

## So với PHP

Magento cache (Redis/file) lưu **giá trị**, vì mỗi request PHP là tiến trình riêng, không chia sẻ được Promise.
Trong Node, mọi request dùng chung bộ nhớ của một tiến trình nên cache Promise trong một `Map` là làm được.

## Yêu cầu

### `createAsyncCache(loader)`

`loader(key)` là hàm async lấy dữ liệu thật (ví dụ gọi database). Trả về object:

- `get(key)`: luôn trả **Promise**.
  - Lần đầu: gọi `loader(key)`.
  - Các lần sau, **kể cả khi lần đầu chưa xong**: dùng lại kết quả, **không gọi `loader` thêm**.
  - `loader` lỗi: Promise reject với lỗi đó, và **không cache lỗi**: lần `get` sau sẽ gọi `loader` lại.
- `delete(key)`: xoá key khỏi cache, lần `get` sau gọi lại `loader`.
- `size` (getter): số key đang có trong cache.

```js
const productCache = createAsyncCache((sku) => db.findProduct(sku));
const [a, b] = await Promise.all([productCache.get('CAP'), productCache.get('CAP')]); // chỉ query 1 lần
```

## Chạy

```bash
npm run check w3-12
```

## Tự kiểm tra sau khi đạt

Cache này không bao giờ hết hạn. Nếu giá sản phẩm đổi thì sao? Bạn sẽ thêm TTL (thời gian sống) như thế nào?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Dùng `new Map()`. Trong `get`: nếu `map.has(key)` thì trả `map.get(key)`. Nếu chưa có, gọi `const promise = loader(key)`,
`map.set(key, promise)` **ngay lập tức** (chưa await), rồi gắn `.catch` để xoá key khi lỗi. Nhớ trả về promise gốc
để người gọi vẫn nhận được lỗi.

</details>
