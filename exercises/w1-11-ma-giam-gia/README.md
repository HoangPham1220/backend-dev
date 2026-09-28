# w1-11 · Áp mã giảm giá

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** viết luật nghiệp vụ nhiều nhánh cho rõ ràng, so sánh thời gian bằng `Date`.

Tương tự Cart Price Rule của Magento, nhưng thu gọn lại.

## So với PHP

- `new Date('2026-10-01T00:00:00Z')` giống `new DateTime('2026-10-01T00:00:00Z')`.
- So sánh hai `Date` bằng `<`, `>` được (JS tự đổi sang số mili-giây). Nhưng **không** dùng `===` để so hai `Date`:
  đó là hai object khác nhau. Muốn so bằng thì dùng `a.getTime() === b.getTime()`.
- `Math.min(a, b)` giống `min($a, $b)`.

## Dữ liệu

```js
const cart = { subtotal: 400000, shippingFee: 30000 };   // tiền hàng, phí ship

const coupon = {
  code: 'SALE10',
  type: 'percent',        // 'percent' | 'fixed' | 'freeship'
  value: 10,              // percent: 10%, fixed: số tiền giảm, freeship: bỏ qua
  minOrder: 300000,       // tùy chọn: subtotal tối thiểu
  expiresAt: '2026-10-31T23:59:59Z', // tùy chọn: hết hạn sau thời điểm này
};

const now = '2026-10-05T10:00:00Z'; // thời điểm hiện tại, truyền vào để test cố định được
```

## Yêu cầu

### 1. `applyCoupon(cart, coupon, now)`

Trả về `{ discount, total, reason }`, với `total = subtotal + shippingFee - discount`.

Kiểm tra theo **đúng thứ tự** sau. Gặp điều kiện nào thì dừng, trả `discount: 0` và `reason` tương ứng:

| Thứ tự | Điều kiện | `reason` |
|---|---|---|
| 1 | `coupon` là `null` hoặc `undefined` | `'Không có mã giảm giá'` |
| 2 | `type` không thuộc 3 loại trên | `'Loại mã không hợp lệ'` |
| 3 | có `expiresAt` và `now` **sau** `expiresAt` (đúng bằng thì vẫn dùng được) | `'Mã đã hết hạn'` |
| 4 | có `minOrder` và `subtotal < minOrder` | `'Đơn hàng chưa đạt tối thiểu 300000'` (số lấy từ `minOrder`) |

Áp được mã thì `reason` là `null` và:

- `percent`: `discount = Math.round(subtotal * value / 100)`.
- `fixed`: `discount = value`, nhưng **không vượt quá `subtotal`**.
- `freeship`: `discount = shippingFee`.

Mã `percent` và `fixed` chỉ giảm trên tiền hàng, không trừ vào phí ship.

```js
applyCoupon({ subtotal: 400000, shippingFee: 30000 }, { code: 'SALE10', type: 'percent', value: 10 }, now);
// { discount: 40000, total: 390000, reason: null }
applyCoupon({ subtotal: 50000, shippingFee: 30000 }, { code: 'GIAM100K', type: 'fixed', value: 100000 }, now);
// { discount: 50000, total: 30000, reason: null }
```

### 2. `pickBestCoupon(cart, coupons, now)`

Trả về `code` của mã giảm được nhiều nhất trong mảng `coupons`. Không mã nào áp được (hoặc mảng rỗng) → `null`.
Hai mã giảm bằng nhau thì chọn mã đứng trước. Dùng lại `applyCoupon`.

## Chạy

```bash
npm run check w1-11
```

## Tự kiểm tra sau khi đạt

Vì sao hàm nhận `now` làm tham số thay vì tự gọi `new Date()` bên trong? Nếu gọi `new Date()` bên trong thì test sẽ gặp vấn đề gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết 4 câu `if` kiểm tra điều kiện thất bại trước, mỗi câu `return` sớm. Sau đó mới tính `discount` theo `type`.
Một hàm nhỏ `rejected(cart, reason)` trả object thất bại sẽ giúp code gọn hơn.

</details>
