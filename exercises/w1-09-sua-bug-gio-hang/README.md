# w1-09 · Sửa bug: giỏ hàng

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** đọc code người khác viết, dùng test và stack trace để tìm bug, sửa đúng chỗ.

Đây là việc bạn đã làm nhiều khi làm support: code có sẵn, "chạy sai", cần tìm nguyên nhân.
Lần này `exercise.js` **đã có code**, nhưng có vài bug. README không nói bug nằm ở đâu, và có bao nhiêu bug.

## Cách làm

1. Chạy `npm run check w1-09`, đọc test trượt đầu tiên: message, expected/actual, dòng trong stack trace.
2. Đoán nguyên nhân **trước khi** sửa. Ghi ra một câu: "bug là ..., vì ...".
3. Sửa tối thiểu đúng chỗ đó. **Không viết lại cả hàm.** Chạy lại.
4. Lặp đến khi đạt hết.

## Hành vi đúng

### 1. `cartSubtotal(items)`

Tổng `price * quantity` của mọi item, luôn trả về **số** (`number`). Giỏ rỗng trả về `0`.

```js
cartSubtotal([
  { sku: 'A', price: 100000, quantity: 2 },
  { sku: 'B', price: 50000, quantity: 1 },
]); // 250000
cartSubtotal([]); // 0
```

### 2. `hasSku(items, sku)`

`true` nếu giỏ có item mang đúng `sku`. SKU luôn là **chuỗi**: truyền số `1001` thì không khớp với sku `'1001'`.

```js
hasSku([{ sku: '1001' }], '1001'); // true
hasSku([{ sku: '1001' }], 1001);   // false
```

### 3. `addItem(items, newItem)`

Trả về **array mới**, không sửa array đầu vào lẫn các object item trong đó.

- SKU chưa có trong giỏ: thêm `newItem` vào cuối.
- SKU đã có: item đó có `quantity` được cộng thêm `newItem.quantity` (trong array mới, dưới dạng object mới).

```js
const cart = [{ sku: 'A', price: 100000, quantity: 1 }];
const next = addItem(cart, { sku: 'A', price: 100000, quantity: 2 });
// next: [{ sku: 'A', price: 100000, quantity: 3 }]
// cart vẫn là [{ sku: 'A', price: 100000, quantity: 1 }]
```

## Chạy

```bash
npm run check w1-09
```

## Tự kiểm tra sau khi đạt

Liệt kê từng bug bạn đã sửa, mỗi bug một câu: triệu chứng quan sát được là gì, và nguyên nhân gốc là gì.
Bug nào mà nếu chỉ nhìn code (không chạy test) bạn sẽ bỏ sót?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- "Cannot read properties of undefined" trong vòng lặp: kiểm tra điều kiện dừng của vòng lặp.
- Kết quả trông giống số nhưng test báo khác: xem `typeof` của giá trị trả về.
- Test báo array gốc bị đổi: tìm những chỗ gọi `push` hoặc gán `item.x = ...` trên dữ liệu đầu vào.

</details>
