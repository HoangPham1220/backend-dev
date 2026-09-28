# w3-02 · Promise cơ bản: tuần tự và song song

**Mục tiêu:** tạo Promise, dùng `async/await`, phân biệt chạy tuần tự và chạy song song bằng `Promise.all`.

## So với PHP

- PHP: `$a = getProduct(1); $b = getProduct(2);` là tuần tự và **chặn** tiến trình: mỗi lệnh chờ xong mới sang lệnh sau.
  Muốn song song phải dùng thư viện riêng (curl_multi, Guzzle promise...).
- Node: gọi hàm async trả về ngay một **Promise** (lời hứa sẽ có kết quả sau). Không chặn tiến trình.
  - `await` từng cái trong vòng lặp → **tuần tự**: tổng thời gian = cộng dồn.
  - Gọi hết một lượt rồi `await Promise.all([...])` → **song song**: tổng thời gian ≈ việc chậm nhất.
- `Promise.all` trả kết quả **theo thứ tự mảng đầu vào**, không theo thứ tự việc nào xong trước.

## Yêu cầu

Bạn được thêm từ khóa `async` vào các hàm nếu cần.

### 1. `delay(ms)`

Trả về một Promise, resolve sau `ms` mili giây. Dùng `new Promise` và `setTimeout`.

```js
await delay(100); // chờ khoảng 100ms
```

### 2. `getProductsSequential(ids, fetchProduct)`

`fetchProduct(id)` là hàm async được truyền vào, trả Promise chứa một sản phẩm.
Lấy sản phẩm **lần lượt từng cái** (xong cái này mới gọi cái sau), trả mảng sản phẩm theo đúng thứ tự `ids`.

### 3. `getProductsParallel(ids, fetchProduct)`

Giống trên nhưng gọi **cùng lúc** tất cả, dùng `Promise.all`. Kết quả vẫn theo đúng thứ tự `ids`.

```js
// fetchProduct giả: mỗi lần mất 100ms
await getProductsSequential([1, 2, 3], fetchProduct); // ~300ms
await getProductsParallel([1, 2, 3], fetchProduct);   // ~100ms
// cả hai trả [{ id: 1, ... }, { id: 2, ... }, { id: 3, ... }]
```

## Chạy

```bash
npm run check w3-02
```

## Tự kiểm tra sau khi đạt

1. Khi nào **bắt buộc** phải chạy tuần tự dù chậm hơn? Nghĩ tới ví dụ: tạo đơn hàng rồi mới trừ tồn kho.
2. Trong `getProductsParallel`, nếu một `fetchProduct` bị lỗi thì `Promise.all` làm gì? (Bài w3-03 sẽ xử lý.)
3. Viết `getProductsParallel` bằng `ids.map(...)`. Vì sao `ids.forEach(async ...)` lại không dùng được?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `delay`: `new Promise((resolve) => { ... })`, gọi `resolve` bên trong callback của `setTimeout`.
- Tuần tự: vòng `for...of`, trong thân vòng lặp có `await`, đẩy kết quả vào một mảng.
- Song song: tạo mảng các Promise (chưa `await`), rồi `await` cả mảng một lần.

</details>
