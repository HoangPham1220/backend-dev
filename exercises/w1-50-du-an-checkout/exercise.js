// Đề bài: README.md cùng thư mục. Chấm: npm run check w1-50
// Các dòng import dưới đây lấy hàm từ thư mục lib/. Tuần 2 sẽ học kỹ về module.
import { mergeLines, buildLines, calcSubtotal } from './lib/cart.js';
import { validateCart } from './lib/stock.js';
import { shippingFee, applyCoupon, calcVat } from './lib/pricing.js';

export function checkout({ cart, products, coupon, region, now }) {
  // TODO
}
