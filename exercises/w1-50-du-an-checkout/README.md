# w1-50 · Dự án: tính tiền checkout

> BÀI TẬP LỚN cuối tuần 1 (3–5 giờ). Dùng mọi thứ đã học tuần 1.

**Mục tiêu:** ghép nhiều hàm nhỏ thành một luồng nghiệp vụ hoàn chỉnh, chia code thành nhiều file có trách nhiệm rõ ràng.

Đây là phiên bản thu nhỏ của bước "Place Order" trong Magento: kiểm tra giỏ, kiểm tồn kho, tính tiền hàng, mã giảm giá,
phí ship, VAT. Bài này sẽ là lõi nghiệp vụ cho API đặt hàng trong dự án lớn từ tuần 4.

## Cấu trúc file

```
w1-50-du-an-checkout/
├── lib/cart.js      gộp dòng, dựng dòng chi tiết, tính tiền hàng
├── lib/stock.js     kiểm tra giỏ hợp lệ và đủ hàng
├── lib/pricing.js   phí ship, mã giảm giá, VAT
└── exercise.js      hàm checkout() ghép tất cả lại
```

Test gọi trực tiếp các hàm trong `lib/`, nên **giữ đúng tên và tham số** như trong khung. Được thêm hàm phụ tùy ý.
Dòng `import`/`export` giữa các file đã viết sẵn (tuần 2 học kỹ).

## Dữ liệu

```js
const products = [
  { sku: 'TS-01', name: 'Áo thun', price: 150000, stock: 10 },
  { sku: 'JN-01', name: 'Quần jean', price: 450000, stock: 2 },
  { sku: 'CP-01', name: 'Mũ lưỡi trai', price: 90000, stock: 0 },
];

const cart = [
  { sku: 'TS-01', quantity: 2 },
  { sku: 'TS-01', quantity: 1 },   // cùng sku có thể xuất hiện nhiều dòng
];

const coupon = { code: 'SALE10', type: 'percent', value: 10, minOrder: 300000, expiresAt: '2026-12-31T23:59:59Z' };
```

## Luồng `checkout({ cart, products, coupon, region, now })`

1. **Gộp dòng:** các dòng cùng sku cộng `quantity`, giữ thứ tự lần xuất hiện đầu tiên.
2. **Kiểm tra** (gom **tất cả** lỗi, không dừng ở lỗi đầu):
   - giỏ rỗng → `'Giỏ hàng trống'`
   - với từng dòng, theo thứ tự trong giỏ:
     - `quantity` không phải số nguyên `>= 1` → `'Số lượng không hợp lệ cho <sku>'` (dòng này không kiểm tra tiếp)
     - không có sản phẩm → `'Không tìm thấy sản phẩm <sku>'`
     - thiếu hàng → `'Không đủ hàng cho <sku>: còn <stock>, cần <quantity>'`
   - `region` rỗng hoặc không phải chuỗi → `'Thiếu khu vực giao hàng'` (đứng sau các lỗi của giỏ)
3. Có lỗi ở bước 2 → trả `{ ok: false, errors }`. **Dừng ở đây**, vì chưa tính được tiền hàng đúng để kiểm tra mã giảm giá.
4. **Dựng dòng chi tiết:** `{ sku, name, price, quantity, lineTotal }`, rồi `subtotal` = tổng `lineTotal`.
5. **Phí ship** theo `subtotal` (trước giảm giá): `>= 500000` → `0`; `'hanoi'`/`'hcm'` → `20000`; còn lại `35000`.
6. **Mã giảm giá** (luật giống w1-11). `coupon` là `null`/`undefined` thì bỏ qua. Mã không áp được →
   `{ ok: false, errors: [reason] }`, với `reason` là một trong: `'Loại mã không hợp lệ'`, `'Mã đã hết hạn'`,
   `'Đơn hàng chưa đạt tối thiểu <minOrder>'`.
   - `percent`: giảm tiền hàng `Math.round(subtotal * value / 100)`.
   - `fixed`: giảm tiền hàng `value`, tối đa bằng `subtotal`.
   - `freeship`: giảm phí ship, bằng phí ship ở bước 5.
7. **VAT 10%** trên tiền hàng sau giảm (`subtotal - giảm tiền hàng`), làm tròn `Math.round`. Phí ship không chịu VAT.
8. Trả về:

```js
{
  ok: true,
  lines,        // các dòng chi tiết
  subtotal,     // tiền hàng
  discount,     // tổng tiền được giảm (tiền hàng hoặc phí ship)
  shipping,     // phí ship trước giảm
  vat,
  total,        // subtotal + shipping - discount + vat
}
```

**Không sửa** `cart`, `products`, `coupon` đầu vào.

## Hàm trong `lib/`

| File | Hàm | Trả về |
|---|---|---|
| `cart.js` | `mergeLines(cart)` | giỏ mới đã gộp sku |
| `cart.js` | `buildLines(cart, products)` | dòng chi tiết (giả định giỏ đã hợp lệ) |
| `cart.js` | `calcSubtotal(lines)` | tổng `lineTotal` |
| `stock.js` | `validateCart(cart, products)` | array lỗi của giỏ (đã gộp), rỗng nếu hợp lệ. Không kiểm tra `region` |
| `pricing.js` | `shippingFee(subtotal, region)` | số tiền |
| `pricing.js` | `applyCoupon(subtotal, shipping, coupon, now)` | `{ goodsDiscount, shippingDiscount, error }`, `error` là `null` hoặc chuỗi `reason` |
| `pricing.js` | `calcVat(amount)` | `Math.round(amount * 0.1)` |

## Ví dụ

```js
checkout({ cart, products, coupon, region: 'hcm', now: '2026-10-05T10:00:00Z' });
// subtotal 450000 (3 áo), shipping 20000, giảm 45000, VAT round(405000 * 0.1) = 40500
// { ok: true, lines: [{ sku: 'TS-01', name: 'Áo thun', price: 150000, quantity: 3, lineTotal: 450000 }],
//   subtotal: 450000, discount: 45000, shipping: 20000, vat: 40500, total: 465500 }
```

## Chạy

```bash
npm run check w1-50
npm run watch w1-50
```

Nên làm theo thứ tự: `cart.js` → `stock.js` → `pricing.js` → `checkout`. Test chia nhóm theo từng file,
nên bạn thấy từng phần đạt dần.

## Tự kiểm tra sau khi đạt

1. Vì sao dừng ở bước 3 thay vì kiểm tra luôn mã giảm giá?
2. Nếu mai sếp muốn thêm loại mã `'buy2get1'`, bạn phải sửa những file nào? Cách chia file hiện tại giúp hay cản việc đó?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- `checkout` chỉ nên là chuỗi lời gọi các hàm trong `lib/`, gần như không có phép tính trực tiếp.
- `mergeLines`: dùng một object bảng tra theo sku, nhớ tạo object dòng mới thay vì sửa object dòng gốc.
- `validateCart`: một array `errors`, duyệt từng dòng, `push` lỗi; dùng `continue` để bỏ qua kiểm tra tiếp của dòng lỗi số lượng.

</details>
