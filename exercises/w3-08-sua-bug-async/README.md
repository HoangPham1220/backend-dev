# w3-08 · Sửa bug bất đồng bộ

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** đọc code async do người khác viết, tìm và sửa lỗi. Đây là việc bạn sẽ làm hằng ngày khi đi làm.

## Bối cảnh

Một đồng nghiệp viết 5 hàm dưới đây trong `exercise.js`. Code **chạy không báo lỗi cú pháp**, nhưng kết quả sai.
Nhiệm vụ: sửa để hàm chạy đúng như mô tả. **Sửa tối thiểu**, không viết lại từ đầu.

Với mỗi hàm, trước khi sửa, hãy viết một dòng comment `// BUG: ...` giải thích vì sao code cũ sai.

## Hành vi đúng

Mọi hàm `fetchXxx` / `saveXxx` truyền vào đều là hàm async (trả Promise).

### 1. `saveAllOrders(orders, saveOrder)`

Lưu từng đơn bằng `saveOrder(order)`. Khi Promise của `saveAllOrders` resolve thì **mọi đơn đã lưu xong**.
Trả về số đơn đã lưu.

### 2. `getProductPrice(id, fetchProduct)`

Lấy sản phẩm bằng `fetchProduct(id)`, trả về `price` của nó.

### 3. `getStockOrZero(sku, fetchStock)`

Trả về tồn kho từ `fetchStock(sku)`. Nếu `fetchStock` lỗi (reject) thì trả về `0`, **không được reject**.

### 4. `fetchPrices(ids, fetchProduct)`

Lấy giá của nhiều sản phẩm song song, trả mảng giá theo đúng thứ tự `ids`.
Sản phẩm nào lỗi thì vị trí đó là `null`. Các sản phẩm khác vẫn phải có giá.

```js
await fetchPrices([1, 2, 3], fetchProduct); // [150000, null, 90000] nếu id 2 lỗi
```

### 5. `getOrderTotal(id, fetchOrder)`

Lấy đơn bằng `fetchOrder(id)`, trả tổng `price * quantity` của các `items`.

## Chạy

```bash
npm run check w3-08
```

## Tự kiểm tra sau khi đạt

Trong 5 bug, bug nào **không** gây lỗi ngay mà chỉ làm dữ liệu sai âm thầm? Vì sao loại bug đó nguy hiểm hơn
bug làm chương trình crash?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Với mỗi hàm, tự hỏi: "Dòng này nhận về một **giá trị** hay một **Promise**?". Thêm `console.log` để in ra
giá trị thật của biến. `forEach` có chờ callback async không? `try/catch` bắt được lỗi của Promise
khi nào? Hàm trong `.then` có `return` gì không?

</details>
