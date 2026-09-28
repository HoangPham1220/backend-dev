# w1-06 · Destructuring, spread và template literal

**Mục tiêu:** tạo object mới từ object cũ mà không sửa object gốc, và lấy dữ liệu lồng nhau gọn gàng.

## So với PHP

- **Khác biệt quan trọng:** trong PHP, gán array là **sao chép** (`$b = $a;` rồi sửa `$b` không ảnh hưởng `$a`).
  Trong JS, gán object/array là **dùng chung tham chiếu**: `const b = a; b.price = 0;` thì `a.price` cũng thành `0`.
- Spread `{ ...product, price: 99 }` tạo object mới, giống `array_merge($product, ['price' => 99])`.
  Key đứng sau ghi đè key đứng trước.
- Destructuring `const { id, customer } = order;` giống `['id' => $id, 'customer' => $customer] = $order;` trong PHP 7.1+.
- Template literal `` `Đơn #${id}` `` giống chuỗi nháy kép có biến trong PHP: `"Đơn #{$id}"`.

## Yêu cầu

### 1. `applyDiscount(product, percent)`

Trả về **object mới** với `price` đã giảm `percent`%, làm tròn bằng `Math.round`. Các thuộc tính khác giữ nguyên.
**Không được sửa** object `product` truyền vào.

```js
const product = { sku: 'TSHIRT-01', name: 'Áo thun', price: 150000 };
applyDiscount(product, 10); // { sku: 'TSHIRT-01', name: 'Áo thun', price: 135000 }
product.price;              // vẫn là 150000
```

### 2. `mergeShippingAddress(defaults, override)`

Trả về object mới gộp hai địa chỉ; key trong `override` thắng. Không sửa cả hai object đầu vào.

```js
mergeShippingAddress(
  { city: 'Hà Nội', country: 'VN', phone: '0900000000' },
  { city: 'Đà Nẵng', street: '12 Bạch Đằng' },
);
// { city: 'Đà Nẵng', country: 'VN', phone: '0900000000', street: '12 Bạch Đằng' }
```

### 3. `summarizeOrder(order)`

Dùng destructuring (kể cả lồng nhau) và template literal để trả về chuỗi tóm tắt:

```js
summarizeOrder({
  id: 12,
  customer: { name: 'Nguyễn Văn A', email: 'a@example.com' },
  items: [
    { sku: 'A', price: 100000, quantity: 2 },
    { sku: 'B', price: 250000, quantity: 1 },
  ],
});
// 'Đơn #12 - Nguyễn Văn A - 3 sản phẩm - 450000đ'
```

- Số sản phẩm = tổng `quantity` của các item.
- Tổng tiền = tổng `price * quantity`, viết liền không có dấu chấm ngăn cách, thêm `đ` ở cuối.

## Chạy

```bash
npm run check w1-06
```

## Tự kiểm tra sau khi đạt

Viết `const copy = { ...order }; copy.customer.name = 'B';`. Tên khách trong `order` gốc có bị đổi không? Vì sao?
(Gợi ý từ khóa để tra: *shallow copy*.)

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`return { ...product, price: ... };`: key `price` đặt **sau** spread để ghi đè.
Destructuring lồng nhau: `const { id, customer: { name }, items } = order;`.

</details>
