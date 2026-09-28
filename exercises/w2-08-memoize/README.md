# w2-08 · Memoize và cache có thời hạn

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** dùng closure để giữ cache riêng cho một hàm, và viết code dễ test bằng cách truyền "thời gian" vào hàm.

## So với PHP

- Trong PHP, mỗi request chạy xong là mọi biến bị xoá, nên cache trong bộ nhớ chỉ sống trong một request.
  Magento phải dùng cache ngoài (Redis, file) để giữ lâu hơn.
- Server Node là **một tiến trình chạy liên tục**. Biến trong closure sống suốt vòng đời server, nên cache
  trong bộ nhớ rất phổ biến. Đổi lại, bạn phải tự lo hết hạn (TTL), nếu không dữ liệu cũ sẽ bị dùng mãi.

## Yêu cầu

### 1. `memoize(fn)`

Trả về hàm mới làm đúng việc của `fn`, nhưng nhớ kết quả theo tham số: gọi lại với **cùng tham số** thì
trả kết quả đã lưu, không gọi `fn` nữa.

- Khóa cache: `JSON.stringify(args)`, trong đó `args` là mảng tham số. Nhờ vậy hai object có cùng nội dung
  được coi là cùng tham số.
- Hàm trả về có thêm method `.clear()` để xoá toàn bộ cache.

```js
const slowTotal = (items) => { /* tính toán nặng */ };
const fastTotal = memoize(slowTotal);
fastTotal([{ price: 100, quantity: 2 }]); // gọi slowTotal
fastTotal([{ price: 100, quantity: 2 }]); // lấy từ cache
fastTotal.clear();
fastTotal([{ price: 100, quantity: 2 }]); // gọi slowTotal lại
```

### 2. `createPriceCache(fetchPrice, ttlMs, now = () => Date.now())`

Cache giá sản phẩm có thời hạn. Trả về object có 2 method:

- `get(sku)`: nếu giá của `sku` đã lưu và **chưa hết hạn** thì trả giá đã lưu. Ngược lại gọi `fetchPrice(sku)`,
  lưu kết quả cùng thời điểm lưu, rồi trả về.
  Hết hạn nghĩa là `now() - thờiĐiểmLưu >= ttlMs`.
- `invalidate(sku)`: xoá giá đã lưu của `sku`, lần `get` sau sẽ gọi `fetchPrice` lại.

Tham số `now` là hàm trả thời gian hiện tại (ms). Mặc định dùng đồng hồ thật. Khi test, truyền đồng hồ giả để
"tua" thời gian mà không phải chờ thật.

```js
let fakeTime = 0;
const cache = createPriceCache(fetchPrice, 1000, () => fakeTime);
cache.get('CAP'); // gọi fetchPrice
fakeTime = 999;
cache.get('CAP'); // từ cache
fakeTime = 1000;
cache.get('CAP'); // hết hạn -> gọi fetchPrice lại
```

## Chạy

```bash
npm run check w2-08
npm run watch w2-08
```

## Tự kiểm tra sau khi đạt

Vì sao `createPriceCache` nhận `now` làm tham số thay vì gọi thẳng `Date.now()` bên trong?
Nếu gọi thẳng thì test "hết hạn sau 1 giờ" phải viết thế nào?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Tạo `const cache = new Map()` **bên trong** `memoize`, trước khi `return` hàm mới.
  Hàm mới dùng rest parameter `(...args)` để nhận mọi tham số.
- Hàm cũng là object, nên gán được thuộc tính: `wrapped.clear = () => cache.clear()`.
- Với `createPriceCache`, mỗi giá trị trong Map lưu dạng `{ price, savedAt }`.

</details>
