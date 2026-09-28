# w1-07 · Xử lý lỗi: throw, try/catch

**Mục tiêu:** biết khi nào nên `throw` lỗi, khi nào nên bắt lỗi và trả về kết quả an toàn.

## So với PHP

- `throw new TypeError('...')` và `try { } catch (err) { }` giống PHP. Khác biệt: JS không có nhiều `catch` theo kiểu lỗi.
  Chỉ có một `catch`, muốn phân loại thì kiểm tra `err instanceof TypeError`.
- Các lớp lỗi có sẵn thường dùng: `Error`, `TypeError` (sai kiểu), `RangeError` (giá trị ngoài phạm vi cho phép).
- `intval("12abc")` trong PHP trả `12`. `Number("12abc")` trong JS trả `NaN`. `parseInt("12abc")` thì lại trả `12`, giống PHP.
  Với dữ liệu người dùng nhập, `Number()` chặt chẽ hơn.
- `json_decode('{sai')` trong PHP **trả `null`** và không ném lỗi (trừ khi dùng `JSON_THROW_ON_ERROR`).
  `JSON.parse('{sai')` trong JS **ném `SyntaxError`**. Để ý: `json_decode('null')` cũng trả `null`, nên PHP khó phân biệt "JSON lỗi" với "JSON hợp lệ có giá trị null".

## Yêu cầu

### 1. `parseQuantity(input)`

Nhận **chuỗi** số lượng từ form, trả về số nguyên dương.

- `input` không phải chuỗi, hoặc không đổi được thành số (`'abc'`, `''`, `'12abc'`) → `throw new TypeError(...)`.
- Là số nhưng không nguyên, hoặc `<= 0` (`'2.5'`, `'0'`, `'-3'`) → `throw new RangeError(...)`.
- Message lỗi phải **chứa giá trị đầu vào**, ví dụ `Số lượng không hợp lệ: "abc"`, để log còn biết dữ liệu nào gây lỗi.
- Khoảng trắng hai đầu được chấp nhận: `' 3 '` → `3`.

```js
parseQuantity('3');    // 3
parseQuantity('abc');  // TypeError: Số lượng không phải số: "abc"
parseQuantity('0');    // RangeError: Số lượng phải là số nguyên dương: "0"
```

### 2. `safeParseJson(text)`

Parse chuỗi JSON nhưng **không bao giờ ném lỗi**:

- Thành công → `{ ok: true, data: <giá trị đã parse> }`
- Thất bại → `{ ok: false, error: <message của lỗi, kiểu string> }`

```js
safeParseJson('{"sku":"A","qty":2}'); // { ok: true, data: { sku: 'A', qty: 2 } }
safeParseJson('null');                // { ok: true, data: null }
safeParseJson('{sai');                // { ok: false, error: 'Expected property name ...' }
```

## Chạy

```bash
npm run check w1-07
```

## Tự kiểm tra sau khi đạt

`parseQuantity` ném lỗi, còn `safeParseJson` trả về object `{ ok, ... }`. Hai cách này hợp với tình huống nào?
Nếu bạn viết API nhận đơn hàng, bạn sẽ dùng cách nào ở đâu?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`parseQuantity`: kiểm tra `typeof input !== 'string'` trước. Sau đó `const value = Number(input.trim());`.
`''` sau khi trim thành chuỗi rỗng, mà `Number('')` là `0` (!), nên cần chặn chuỗi rỗng riêng.
Tiếp theo kiểm tra `Number.isNaN(value)`, cuối cùng mới kiểm tra `Number.isInteger` và `> 0`.

`safeParseJson`: bọc `JSON.parse` trong `try`, `return` ở cả nhánh `try` lẫn `catch`. Trong `catch`, dùng `err.message`.

</details>
