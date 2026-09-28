// Đề bài: README.md cùng thư mục. Chấm: npm run check w2-04
// File này đã xong: nó gom (re-export) hàm từ các module trong lib/ để file test import từ một chỗ.
// Bạn làm lib/price.js và lib/cart.js.

export { applyVat } from './lib/price.js';
export { cartTotalWithVat } from './lib/cart.js';
