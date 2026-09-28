// Bản cài đặt ĐÚNG. Không sửa file này. Nhiệm vụ của bạn là viết test cho nó trong my.test.js.
//
// calculateDiscount(subtotal, coupon) trả về số tiền được giảm (VND, số nguyên).
//
// coupon = null | {
//   type: 'percent' | 'fixed',
//   value: number,          // percent: 0–100; fixed: số tiền
//   minSubtotal?: number,   // đơn phải >= mức này mới được giảm
//   maxDiscount?: number,   // chỉ áp dụng cho percent: giảm tối đa
// }
export function calculateDiscount(subtotal, coupon) {
  if (coupon === null || coupon === undefined) return 0;
  if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) return 0;

  if (coupon.type === 'percent') {
    const discount = Math.round((subtotal * coupon.value) / 100);
    return coupon.maxDiscount !== undefined ? Math.min(discount, coupon.maxDiscount) : discount;
  }
  if (coupon.type === 'fixed') {
    return Math.min(coupon.value, subtotal);
  }
  throw new Error(`Loại coupon không hỗ trợ: ${coupon.type}`);
}
