# w1-02 · Dự đoán kiểu và ép kiểu

**Mục tiêu:** nắm cách JavaScript tự ép kiểu (`+`, `-`, `*`), truthy/falsy, `||` và `??`, `==` và `===`.

## So với PHP

- PHP nối chuỗi bằng `.`, còn JS dùng `+` cho cả cộng số lẫn nối chuỗi. Chỉ cần một vế là chuỗi thì `+` sẽ nối chuỗi.
- Các phép `-`, `*`, `/` luôn cố đổi hai vế sang số.
- Trong PHP, chuỗi `"0"` là falsy. Trong JS, **mọi chuỗi khác rỗng đều truthy**, kể cả `"0"`. Mảng rỗng `[]` cũng truthy (PHP thì falsy).
- `??` giống PHP: chỉ lấy vế phải khi vế trái là `null` hoặc `undefined`. `||` lấy vế phải khi vế trái là **bất kỳ giá trị falsy nào** (`0`, `""`, `false`, `NaN`, `null`, `undefined`).

## Yêu cầu

Mở `exercise.js` và điền giá trị bạn dự đoán cho từng biểu thức vào object `answers`.

**Quy tắc:**

1. Dự đoán trước, **không chạy thử** trong Node hay trình duyệt.
2. Ghi đúng kiểu: `"32"` (chuỗi) khác `32` (số), `true` khác `"true"`.
3. Chạy `npm run check w1-02`. Câu nào sai thì đọc message, rồi **tự giải thích bằng lời** vì sao kết quả như vậy trước khi sửa đáp án.

## Chạy

```bash
npm run check w1-02
```

## Tự kiểm tra sau khi đạt

Bạn có `const quantity = 0;` và muốn đặt mặc định là `1` khi thiếu số lượng. Nên dùng `quantity || 1` hay `quantity ?? 1`? Vì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Với `+`: nếu có một vế là chuỗi thì cả phép tính thành nối chuỗi. Với `-` và `*`: JS đổi cả hai vế sang số.
Với `||` và `&&`: kết quả là **một trong hai vế** chứ không phải `true`/`false`.
`&&` trả về vế trái nếu vế trái falsy, ngược lại trả về vế phải.

</details>
