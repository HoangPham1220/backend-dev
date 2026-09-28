# w2-01 · Tham chiếu: cập nhật giỏ hàng không làm hỏng dữ liệu gốc

**Mục tiêu:** hiểu object/array trong JS được truyền theo tham chiếu, và viết hàm cập nhật dữ liệu mà không sửa dữ liệu gốc (bất biến – immutable).

## So với PHP

- Trong PHP, gán array là **copy**: `$b = $a; $b[] = 1;` không làm đổi `$a`.
- Trong JS, gán object/array là **copy tham chiếu**: `const b = a; b.push(1);` thì `a` cũng đổi, vì `a` và `b` trỏ tới cùng một mảng.
- Truyền object vào hàm cũng vậy: hàm sửa `cart.items.push(...)` là sửa luôn giỏ hàng của người gọi.
- Tạo bản sao nông (shallow copy): `[...arr]`, `{ ...obj }`. Bản sao nông chỉ copy tầng ngoài cùng; object lồng bên trong vẫn dùng chung.
- `const` chỉ cấm gán lại biến, **không** cấm sửa nội dung object: `const cart = {}; cart.x = 1;` vẫn chạy.

## Yêu cầu

Giỏ hàng có dạng:

```js
const cart = {
  items: [
    { sku: 'TSHIRT', price: 150000, quantity: 2 },
  ],
  updatedBy: 'admin',
};
```

Cả hai hàm dưới đây **không được sửa** `cart` truyền vào, cả mảng `items` lẫn từng object item bên trong. Luôn trả về một cart **mới**, giữ nguyên các thuộc tính khác của cart (ví dụ `updatedBy`).

### 1. `addItemToCart(cart, item)`

- `sku` chưa có trong giỏ → thêm item vào cuối `items`.
- `sku` đã có → cộng dồn `quantity` vào item đó (giữ nguyên vị trí).

```js
const next = addItemToCart(cart, { sku: 'TSHIRT', price: 150000, quantity: 1 });
next.items[0].quantity;  // 3
cart.items[0].quantity;  // vẫn là 2
```

### 2. `updateQuantity(cart, sku, quantity)`

- Đặt lại `quantity` của item có `sku` tương ứng.
- `quantity` là `0` → xoá item khỏi giỏ.
- `sku` không có trong giỏ → trả về cart mới có nội dung y hệt.

```js
updateQuantity(cart, 'TSHIRT', 5).items[0].quantity; // 5
updateQuantity(cart, 'TSHIRT', 0).items;             // []
```

## Chạy

```bash
npm run check w2-01
npm run watch w2-01
```

## Tự kiểm tra sau khi đạt

Nếu trong `addItemToCart` bạn viết `const items = [...cart.items]; items[0].quantity += 1;` thì cart gốc có bị đổi không? Vì sao, dù đã copy mảng?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Dùng `map` để tạo mảng mới: item nào cần đổi thì trả về `{ ...item, quantity: ... }`, còn lại trả về chính item đó.
Xoá item thì dùng `filter`. Cart mới: `{ ...cart, items: newItems }`.

</details>
