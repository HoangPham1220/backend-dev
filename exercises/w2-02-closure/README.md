# w2-02 · Closure: bộ sinh mã đơn và giỏ hàng có dữ liệu riêng tư

**Mục tiêu:** hiểu closure: hàm bên trong vẫn "nhớ" và dùng được biến của hàm bên ngoài, kể cả sau khi hàm bên ngoài đã chạy xong.

## So với PHP

- PHP có closure nhưng phải khai báo rõ biến lấy từ ngoài: `function () use (&$count) { ... }`.
  JS tự động "bắt" mọi biến ở phạm vi bên ngoài, không cần `use`.
- Trong PHP, muốn giấu dữ liệu thường dùng class với `private`. Trong JS, closure là cách phổ biến để có biến riêng tư mà không cần class.

```js
function createCounter() {
  let count = 0;             // biến này chỉ hàm bên trong truy cập được
  return () => {
    count += 1;
    return count;
  };
}
const next = createCounter();
next(); // 1
next(); // 2
```

## Yêu cầu

### 1. `createIdGenerator(prefix)`

Trả về một **hàm**. Mỗi lần gọi hàm đó được mã tiếp theo: `prefix` + `-` + số thứ tự 4 chữ số.

```js
const nextOrderId = createIdGenerator('ORD');
nextOrderId(); // 'ORD-0001'
nextOrderId(); // 'ORD-0002'

const nextInvoiceId = createIdGenerator('INV');
nextInvoiceId(); // 'INV-0001'  (mỗi generator đếm riêng)
```

### 2. `createCart()`

Trả về object có 4 phương thức. Danh sách item lưu trong một biến **bên trong** `createCart`, không để lộ ra ngoài (object trả về không có thuộc tính `items`).

- `add(sku, price, quantity)`: thêm item; sku đã có thì cộng dồn quantity.
- `remove(sku)`: xoá item theo sku (không có thì bỏ qua).
- `total()`: tổng tiền = tổng `price * quantity`.
- `count()`: tổng số lượng sản phẩm (cộng các quantity).

```js
const cart = createCart();
cart.add('TSHIRT', 150000, 2);
cart.add('CAP', 90000, 1);
cart.total(); // 390000
cart.count(); // 3
cart.items;   // undefined
```

## Chạy

```bash
npm run check w2-02
npm run watch w2-02
```

## Tự kiểm tra sau khi đạt

Hai giỏ tạo bằng `createCart()` gọi hai lần có dùng chung danh sách item không? Vì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Khai báo `let` đếm (hoặc mảng item) **bên trong** hàm `create...`, rồi `return` một hàm/object dùng biến đó.
Số 4 chữ số: `String(1).padStart(4, '0')` → `'0001'`.

</details>
