# w2-04 · Module: tách code tính giá ra nhiều file

**Mục tiêu:** chia code thành module, dùng `export`/`import` để các file dùng lại hàm của nhau thay vì viết lại.

## So với PHP

| PHP | JavaScript (ES Modules) |
|---|---|
| `namespace App\Price;` + class/hàm trong file | Mỗi file là một module, không cần khai báo namespace |
| `use App\Price\Vat;` | `import { applyVat } from './price.js';` |
| Composer autoload tự tìm file theo tên class | Không có autoload: đường dẫn ghi rõ trong `import` |
| Mọi hàm public mặc định | Chỉ thứ được `export` mới dùng được từ file khác |

Node có **hai** hệ thống module, bạn sẽ gặp cả hai khi đọc code:

```js
// CommonJS: kiểu cũ, vẫn rất phổ biến
const { applyVat } = require('./price');
module.exports = { cartTotalWithVat };

// ES Modules (ESM): chuẩn của ngôn ngữ, repo này dùng kiểu này
import { applyVat } from './price.js';
export function cartTotalWithVat(items) { ... }
```

- Node dùng ESM cho file `.js` khi `package.json` có `"type": "module"` (xem `package.json` ở gốc repo).
  Không có dòng đó thì Node coi `.js` là CommonJS và `import` sẽ báo lỗi.
- Với ESM trong Node, **phải ghi đuôi `.js`** trong đường dẫn: `'./price.js'`, không phải `'./price'`.

## Yêu cầu

Bài này có nhiều file. `exercise.js` đã viết sẵn phần re-export, bạn làm hai file trong `lib/`:

### 1. `lib/price.js`: export `applyVat(amount, rate = 0.1)`

Trả về giá sau VAT, làm tròn về số nguyên bằng `Math.round` (tiền VND không có số lẻ).

```js
applyVat(100000);       // 110000
applyVat(99999);        // 109999  (109998.9 làm tròn)
applyVat(100000, 0.08); // 108000
```

### 2. `lib/cart.js`: export `cartTotalWithVat(items)`

`items` dạng `[{ sku, price, quantity }]`. Cộng tổng `price * quantity`, rồi áp VAT 10% **một lần** trên tổng.
**Bắt buộc** `import { applyVat } from './price.js'`, không viết lại công thức VAT trong `cart.js`.

```js
cartTotalWithVat([
  { sku: 'TSHIRT', price: 150000, quantity: 2 },
  { sku: 'CAP', price: 90000, quantity: 1 },
]); // 429000
cartTotalWithVat([]); // 0
```

## Chạy

```bash
npm run check w2-04
npm run watch w2-04
```

## Tự kiểm tra sau khi đạt

Nếu mai kia mức VAT mặc định đổi thành 8%, bạn phải sửa mấy chỗ? Nếu `cart.js` tự viết `* 1.1` thì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Trong `lib/price.js` viết `export function applyVat(...) { ... }`.
Trong `lib/cart.js`, dòng đầu tiên là `import { applyVat } from './price.js';`. Đường dẫn tính từ vị trí file `cart.js`,
nên dùng `./price.js`, không phải `./lib/price.js`.

</details>
