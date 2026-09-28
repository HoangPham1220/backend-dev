# w1-01 · Hàm và điều kiện: phí ship

**Mục tiêu:** viết hàm có nhiều nhánh điều kiện, kiểm tra kiểu dữ liệu đầu vào.

## So với PHP

- `typeof x === 'number'` gần giống `is_int($x) || is_float($x)` trong PHP.
- Bẫy: `typeof NaN` cũng là `'number'`. `NaN` (Not a Number) là kết quả của phép tính hỏng, ví dụ `Number('abc')`.
  Kiểm tra bằng `Number.isNaN(x)`.
- `Number.isInteger(x)` kiểm tra số nguyên. Không tự đổi chuỗi sang số: `Number.isInteger('2')` là `false`.

## Yêu cầu

### 1. `calculateShipping(orderTotal, region)`

Trả về phí ship theo luật:

1. `orderTotal` không phải số, là `NaN`, hoặc nhỏ hơn 0 → trả về `null`.
2. `orderTotal >= 500000` → miễn phí, trả về `0`.
3. `region` là `"hanoi"` hoặc `"hcm"` → `20000`.
4. Còn lại → `35000`.

```js
calculateShipping(600000, 'danang'); // 0
calculateShipping(200000, 'hcm');    // 20000
calculateShipping(200000, 'hue');    // 35000
calculateShipping('200000', 'hcm');  // null
calculateShipping(NaN, 'hcm');       // null
```

### 2. `isValidQuantity(value)`

Trả về `true` nếu `value` là số nguyên dương (1, 2, 3...), ngược lại `false`.

```js
isValidQuantity(3);    // true
isValidQuantity(0);    // false
isValidQuantity(2.5);  // false
isValidQuantity('2');  // false
```

## Chạy

```bash
npm run check w1-01     # chấm một lần
npm run watch w1-01     # tự chấm lại mỗi lần lưu file
```

## Tự kiểm tra sau khi đạt

Thứ tự các câu `if` trong `calculateShipping` có quan trọng không? Nếu đảo luật 1 xuống cuối thì test nào hỏng, vì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Xử lý các trường hợp "không hợp lệ" trước tiên và `return` sớm. Mỗi luật là một `if` có `return`,
khi đó không cần `else`.

</details>
