# w2-03 · Class và `this`: quản lý tồn kho

**Mục tiêu:** viết class trong JS và hiểu vì sao `this` có thể "mất" khi tách method ra khỏi object.

## So với PHP

- Cú pháp class khá giống: `class Inventory { constructor() {...} add() {...} }`, tạo bằng `new Inventory()`.
  `constructor` tương đương `__construct`, và luôn phải viết `this.x` (không có `$this->x`).
- Khác biệt lớn: trong PHP, `$this` **luôn** gắn với object. Trong JS, `this` phụ thuộc vào **cách gọi hàm**:

```js
const inventory = new Inventory({ A: 5 });
inventory.getStock('A');          // gọi qua object → this là inventory → 5

const getStock = inventory.getStock;
getStock('A');                    // gọi hàm trần → this là undefined → TypeError
['A'].map(inventory.getStock);    // map gọi hàm trần → lỗi y như trên
```

Lỗi này rất hay gặp khi truyền method làm callback (ví dụ route handler trong Express ở tuần 4).

## Yêu cầu

Viết `class Inventory`:

- `constructor(initialStock = {})`: `initialStock` dạng `{ SKU: số lượng }`. Không dùng chung object truyền vào (copy ra).
- `add(sku, quantity)`: cộng thêm tồn kho (sku chưa có thì bắt đầu từ 0).
- `remove(sku, quantity)`: trừ tồn kho. Không đủ hàng → `throw new Error(...)` với message chứa `Không đủ hàng`, và tồn kho giữ nguyên.
- `getStock(sku)`: trả số tồn; sku chưa có → `0`.
- **Yêu cầu thêm:** `getStock` vẫn chạy đúng khi tách rời làm callback:

```js
const inventory = new Inventory({ A: 5, B: 0 });
['A', 'B', 'C'].map(inventory.getStock); // [5, 0, 0]
```

## Chạy

```bash
npm run check w2-03
npm run watch w2-03
```

## Tự kiểm tra sau khi đạt

Giải thích bằng lời: vì sao `inventory.getStock('A')` chạy được nhưng `const f = inventory.getStock; f('A')` thì lỗi (trước khi bạn sửa)?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Có hai cách phổ biến:

1. Khai báo `getStock` dạng **class field với arrow function**: `getStock = (sku) => { ... };`
   Arrow function không có `this` riêng, nó lấy `this` của nơi được tạo ra (chính là object).
2. Trong `constructor`: `this.getStock = this.getStock.bind(this);`

Muốn copy object: `{ ...initialStock }`.

</details>
