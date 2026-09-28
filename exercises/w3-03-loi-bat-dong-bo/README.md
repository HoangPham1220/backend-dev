# w3-03 · Xử lý lỗi bất đồng bộ

**Mục tiêu:** bắt lỗi của Promise bằng `try/catch` + `await`, và xử lý một lô việc mà một số việc có thể lỗi.

## So với PHP

- PHP: `try { $p = $api->getProduct($id); } catch (Exception $e) { ... }` bắt được lỗi vì mọi thứ chạy tuần tự.
- Node: `try/catch` chỉ bắt được lỗi của Promise khi bạn **`await`** Promise đó **bên trong** khối `try`.
  Quên `await` thì Promise bị reject sau khi đã ra khỏi `try` → lỗi lọt ra ngoài.
- Promise bị reject mà không ai bắt gọi là **unhandled rejection**. Từ Node 15, lỗi này làm **tắt cả tiến trình**,
  tức là sập cả API đang phục vụ mọi người dùng, không chỉ một request như PHP.
- `Promise.all` hỏng ngay khi **một** việc lỗi. `Promise.allSettled` chờ **tất cả** xong rồi cho biết việc nào
  thành công (`status: 'fulfilled'`, có `value`), việc nào lỗi (`status: 'rejected'`, có `reason`).

## Yêu cầu

`fetchProduct(id)` là hàm async được truyền vào: trả sản phẩm, hoặc reject khi sản phẩm không tồn tại.
Bạn được thêm `async` vào hàm nếu cần.

### 1. `getProductOrNull(id, fetchProduct)`

Trả sản phẩm nếu lấy được, trả `null` nếu `fetchProduct` lỗi. Không để lỗi lọt ra ngoài.

```js
await getProductOrNull(1, fetchProduct);   // { id: 1, ... }
await getProductOrNull(404, fetchProduct); // null
```

### 2. `fetchMany(ids, fetchProduct)`

Gọi **song song** cho mọi id, dùng `Promise.allSettled`. Trả về:

```js
await fetchMany([1, 404, 2, 500], fetchProduct);
// {
//   products: [{ id: 1, ... }, { id: 2, ... }],  // thành công, theo thứ tự ids
//   failedIds: [404, 500],                        // lỗi, theo thứ tự ids
// }
```

## Chạy

```bash
npm run check w3-03
```

## Tự kiểm tra sau khi đạt

1. Trong `getProductOrNull`, đổi `return await fetchProduct(id)` thành `return fetchProduct(id)` (bỏ `await`,
   vẫn trong `try`). Chạy lại test. Chuyện gì xảy ra, vì sao?
2. Khi nào nên dùng `Promise.all`, khi nào nên dùng `Promise.allSettled`? Cho một ví dụ ecommerce cho mỗi cái.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `getProductOrNull`: hàm `async`, trong `try` phải có `await`, `catch` trả `null`.
- `fetchMany`: `Promise.allSettled(ids.map(...))` trả mảng kết quả cùng thứ tự `ids`. Duyệt mảng đó cùng với index
  để biết id nào lỗi.

</details>
