# w1-03 · Vòng lặp với array

**Mục tiêu:** duyệt array bằng `for...of`, kết hợp điều kiện và biến tích lũy.

Bài này **chỉ dùng `for...of`**, chưa dùng `map`/`filter`/`find`/`reduce`. Bài w1-04 sẽ làm lại bằng các phương thức đó.

## So với PHP

- `for (const product of products) { ... }` tương đương `foreach ($products as $product) { ... }`.
- Cần cả index thì dùng `for (const [index, product] of products.entries())`, giống `foreach ($products as $index => $product)`.
- Đừng nhầm với `for...in`: nó duyệt **key** (với array là index dạng chuỗi `"0"`, `"1"`), không phải phần tử.
- Truy cập thuộc tính object bằng dấu chấm: `product.stock`, không phải `$product['stock']`.

## Dữ liệu mẫu

```js
const products = [
  { sku: 'TSHIRT-01', name: 'Áo thun', price: 150000, stock: 10 },
  { sku: 'CAP-02', name: 'Mũ lưỡi trai', price: 90000, stock: 0 },
  { sku: 'BAG-03', name: 'Túi vải', price: 200000, stock: 3 },
];
```

## Yêu cầu

### 1. `countInStock(products)`

Đếm số sản phẩm có `stock > 0`.

```js
countInStock(products); // 2
countInStock([]);       // 0
```

### 2. `findProductBySku(products, sku)`

Trả về **chính object** sản phẩm có `sku` trùng khớp. Không tìm thấy thì trả về `null`.

```js
findProductBySku(products, 'CAP-02');  // { sku: 'CAP-02', name: 'Mũ lưỡi trai', ... }
findProductBySku(products, 'NOPE');    // null
```

### 3. `totalStockValue(products)`

Tổng giá trị tồn kho, tức tổng `price * stock` của mọi sản phẩm.

```js
totalStockValue(products); // 150000*10 + 90000*0 + 200000*3 = 2100000
totalStockValue([]);       // 0
```

## Chạy

```bash
npm run check w1-03
```

## Tự kiểm tra sau khi đạt

Trong `findProductBySku`, nếu bạn `return` ngay khi tìm thấy thì vòng lặp có chạy tiếp các phần tử sau không? Điều đó có ý nghĩa gì khi array có 100.000 sản phẩm?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Khai báo biến tích lũy bằng `let` trước vòng lặp (ví dụ `let count = 0;`), cập nhật nó trong vòng lặp, `return` sau vòng lặp.
Với `findProductBySku`: `return` ngay bên trong vòng lặp khi khớp, và `return null` sau vòng lặp.

</details>
