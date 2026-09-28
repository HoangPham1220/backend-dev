// MUTANT: bản cài đặt có một bug cố ý. Test tốt phải FAIL khi chạy với file này.
// Chỉ mở file này khi đã tự viết test theo đặc tả mà vẫn không bắt được.
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
    return coupon.value;
  }
  throw new Error(`Loại coupon không hỗ trợ: ${coupon.type}`);
}
