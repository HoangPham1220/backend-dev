# w9-01 · Viết test bắt được bug

**Mục tiêu:** tự viết unit test bằng `node:test`. Test tốt là test **bắt được bug**, không chỉ là test chạy xanh.

Bài này đảo vai: code đã có sẵn và đúng, **bạn viết test**. File bạn sửa là `my.test.js`, không phải `exercise.js`.

## Cách chấm (ý tưởng mutation testing)

- `lib/discount.js` là bản cài đặt **đúng**.
- Thư mục `mutants/` có 5 bản sao, mỗi bản bị cài **một bug** nhỏ.
- `npm run check w9-01` chạy `my.test.js` của bạn với từng bản:
  - Với bản đúng: test của bạn phải **pass** hết, và phải có **ít nhất 6 test**.
  - Với mỗi mutant: test của bạn phải **fail** (tức là "giết" được mutant).

Nếu một mutant vẫn sống (test của bạn vẫn xanh), nghĩa là bộ test có lỗ hổng: bug đó lọt ra production mà không ai biết.

## So với PHP

PHPUnit: `class DiscountTest extends TestCase`, `$this->assertSame(...)`. Node có sẵn test runner, không cần cài gì:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('mô tả trường hợp', () => {
  assert.equal(actual, expected);          // giống assertSame
  assert.deepEqual(obj, { a: 1 });         // so sánh object theo nội dung
  assert.throws(() => fn(), /thông báo/);  // giống expectException
});
```

Muốn chạy riêng test của bạn cho nhanh: `node --test exercises/w9-01-viet-test/my.test.js`.

## Đặc tả `calculateDiscount(subtotal, coupon)`

Trả về số tiền được giảm (VND, số nguyên):

1. `coupon` là `null` hoặc `undefined` → `0`.
2. Có `minSubtotal` và `subtotal < minSubtotal` → `0`. Đúng bằng `minSubtotal` thì **được** giảm.
3. `type: 'percent'`: giảm `subtotal × value / 100`, **làm tròn** (`Math.round`). Có `maxDiscount` thì không giảm quá mức đó.
4. `type: 'fixed'`: giảm `value`, nhưng **không vượt quá** `subtotal`.
5. `type` khác → throw `Error`.

## Yêu cầu

Viết test trong `my.test.js` bao phủ đặc tả trên, đủ để giết cả 5 mutant.
**Viết từ đặc tả trước, đừng mở thư mục `mutants/`.** Chỉ mở khi đã cố mà vẫn còn mutant sống.

## Khi đi làm

Đi làm thường dùng `node:test`, `vitest` hoặc `jest`. Công cụ mutation testing thật cho JavaScript là **Stryker**.
Độ phủ dòng code (coverage) 100% vẫn có thể bỏ sót bug; mutation testing đo chất lượng test sát hơn.

## Chạy

```bash
npm run check w9-01
npm run watch w9-01
```

## Tự kiểm tra sau khi đạt

1. Một bộ test đạt coverage 100% nhưng vẫn để sống mutant-4. Giải thích vì sao có thể như vậy.
2. Giá trị biên (boundary) là gì? Trong đặc tả trên, những giá trị biên nào đáng test?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Mỗi luật trong đặc tả ít nhất một test, và test **đúng tại biên**: `subtotal` bằng đúng `minSubtotal`,
  coupon fixed lớn hơn `subtotal`, percent có phần lẻ đúng `.5` trở lên.
- Chọn số liệu làm kết quả `Math.round` và `Math.floor` khác nhau, ví dụ 15% của 99 999.

</details>
