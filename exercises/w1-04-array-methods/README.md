# w1-04 · Phương thức array: filter, map, reduce, find, some

**Mục tiêu:** dùng đúng phương thức array cho từng việc, thay cho vòng lặp viết tay.

## So với PHP

| JavaScript | PHP tương đương | Trả về |
|---|---|---|
| `arr.filter(fn)` | `array_filter($arr, $fn)` | array mới gồm phần tử làm `fn` trả truthy |
| `arr.map(fn)` | `array_map($fn, $arr)` | array mới cùng độ dài |
| `arr.reduce(fn, initial)` | `array_reduce($arr, $fn, $initial)` | một giá trị |
| `arr.find(fn)` | không có sẵn | phần tử đầu tiên khớp, hoặc `undefined` |
| `arr.some(fn)` | không có sẵn | `true` nếu có ít nhất một phần tử khớp |

Khác biệt:

- JS gọi trên chính array (`products.filter(...)`), thứ tự tham số không lộn xộn như PHP.
- `filter` trong JS trả về array được đánh lại index từ 0. PHP `array_filter` giữ nguyên key cũ.
- `find` trả về `undefined` khi không thấy. Đề bài yêu cầu `null`, nên cần xử lý thêm (gợi ý: `??`).
- Arrow function viết gọn: `(p) => p.stock > 0`.

## Yêu cầu

**Không dùng `for`/`for...of`/`while`** trong bài này.

### 1. `getActiveProductNames(products)`

Trả về array tên (`name`) của các sản phẩm có `active === true`, giữ nguyên thứ tự.

```js
getActiveProductNames([
  { name: 'Áo thun', active: true },
  { name: 'Mũ', active: false },
  { name: 'Túi', active: true },
]); // ['Áo thun', 'Túi']
```

### 2. `cartTotal(items)`

Tổng tiền giỏ hàng: tổng `price * quantity`. Giỏ rỗng trả về `0`.

```js
cartTotal([
  { sku: 'A', price: 100000, quantity: 2 },
  { sku: 'B', price: 50000, quantity: 1 },
]); // 250000
cartTotal([]); // 0
```

### 3. `findOrderById(orders, id)`

Trả về đơn hàng có `id` trùng khớp, không có thì `null`.

### 4. `hasOutOfStock(products)`

`true` nếu có ít nhất một sản phẩm `stock === 0`, ngược lại `false`.

## Chạy

```bash
npm run check w1-04
```

## Tự kiểm tra sau khi đạt

Nếu gọi `reduce` trên array rỗng mà **không** truyền giá trị khởi tạo thì sao? Thử dự đoán rồi chạy `[].reduce((a, b) => a + b)` để kiểm chứng.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Có thể nối các phương thức: `products.filter(...).map(...)`.
`reduce((sum, item) => sum + ..., 0)`: tham số thứ hai `0` là giá trị ban đầu của `sum`.

</details>
