# w2-07 · Sửa bug: tham chiếu và closure

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** đọc code có sẵn, tìm và sửa bug do tham chiếu object/array và closure gây ra.

`exercise.js` đã có code **chạy được nhưng sai**. Đây là tình huống bạn sẽ gặp hằng ngày khi đi làm:
đọc code người khác, tái hiện lỗi, tìm nguyên nhân, sửa tối thiểu.

## Cách làm

1. Chạy `npm run check w2-07`, đọc test trượt.
2. Với mỗi hàm: tự viết ra (giấy hoặc comment) **vì sao** nó sai trước khi sửa.
3. Sửa ít nhất có thể. Không viết lại toàn bộ hàm nếu chỉ cần đổi một dòng.

## Hành vi đúng

### 1. `createOrder(id, tags)`

Trả về đơn mới `{ id, tags }`, trong đó `tags` là các tag truyền vào **cộng thêm** tag `'new'` ở cuối.
Không truyền `tags` thì đơn có `tags: ['new']`.

- Mảng `tags` truyền vào **không bị thay đổi**.
- Các đơn tạo liên tiếp không ảnh hưởng nhau.

```js
createOrder(1);           // { id: 1, tags: ['new'] }
createOrder(2);           // { id: 2, tags: ['new'] }
const vipTags = ['vip'];
createOrder(3, vipTags);  // { id: 3, tags: ['vip', 'new'] }
vipTags;                  // ['vip']  (không đổi)
```

### 2. `getTopProducts(products, n)`

Trả về `n` sản phẩm có giá cao nhất, sắp giá giảm dần. Mảng `products` giữ **nguyên thứ tự ban đầu**.

### 3. `duplicateOrder(order, newId)`

Tạo bản nháp từ đơn cũ: giống hệt đơn gốc nhưng `id = newId`, `status = 'draft'`.
Sửa bản nháp (thêm item, đổi quantity, đổi địa chỉ giao hàng) **không được** ảnh hưởng đơn gốc.

### 4. `createSkuPrinters(skus)`

Trả về mảng hàm, hàm thứ `i` khi gọi trả về `skus[i]`.

```js
const printers = createSkuPrinters(['A1', 'B2']);
printers[0](); // 'A1'
printers[1](); // 'B2'
```

## Chạy

```bash
npm run check w2-07
npm run watch w2-07
```

## Tự kiểm tra sau khi đạt

Với mỗi hàm, giải thích bằng một câu: bug nằm ở đâu, vì sao nó xảy ra trong JavaScript mà có thể không xảy ra
(hoặc xảy ra khác đi) trong PHP?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Hàm 1: `DEFAULT_TAGS` được tạo **một lần** khi load module. Mọi lần gọi dùng chung đúng mảng đó.
  `push` sửa mảng tại chỗ.
- Hàm 2: `const sorted = products` không tạo bản sao. `sort` sửa mảng tại chỗ.
- Hàm 3: spread `{ ...order }` chỉ sao chép một tầng. Tìm hiểu `structuredClone`.
- Hàm 4: so sánh `var` và `let` trong vòng lặp `for`.

</details>
