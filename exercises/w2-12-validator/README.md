# w2-12 · Tự viết bộ validate dữ liệu theo schema

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** viết hàm nhận "cấu hình" (schema) và trả về hàm kiểm tra, tức là dùng closure để tạo hàm theo cấu hình.
Đây là nền cho phần validation request API ở tuần 4.

## So với PHP

Magento validate dữ liệu rải rác (`Zend_Validate`, `validate()` trong model, rule ở form UI). Hệ sinh thái Node hay
dùng thư viện schema như **zod** hoặc **joi**: khai báo schema một lần, dùng lại ở nhiều nơi. Bài này tự viết
một bản nhỏ để hiểu chúng làm gì.

## Yêu cầu

### `createValidator(schema)`

Nhận `schema` là object, mỗi key là tên field, value là luật. Trả về hàm `validate(data)` → `{ valid, errors }`.

Các luật hỗ trợ:

| Luật | Ý nghĩa | `rule` khi lỗi |
|---|---|---|
| `required: true` | Field phải có (không phải `undefined` hay `null`) | `'required'` |
| `type` | `'string'`, `'number'` (không tính `NaN`), `'boolean'`, `'array'` (dùng `Array.isArray`) | `'type'` |
| `min` / `max` | Với số: giá trị nhỏ nhất / lớn nhất (tính cả biên) | `'min'` / `'max'` |
| `minLength` | Với chuỗi: độ dài tối thiểu | `'minLength'` |
| `pattern` | Với chuỗi: phải khớp RegExp | `'pattern'` |

Cách kiểm tra:

1. Duyệt field **theo thứ tự trong schema**. Field có trong `data` mà không có trong schema thì bỏ qua.
2. Field không có giá trị (`undefined`/`null`): nếu `required` thì lỗi `required`, ngược lại bỏ qua mọi luật khác.
3. Kiểm tra theo thứ tự `type` → `min` → `max` → `minLength` → `pattern`. **Mỗi field chỉ báo lỗi đầu tiên** gặp phải.
4. Mỗi lỗi có dạng `{ field, rule, message }`, `message` là câu tiếng Việt bạn tự đặt (không để trống).
5. `valid` là `true` khi không có lỗi nào.
6. `data` không phải object thường (là `null`, mảng, chuỗi...) → `throw new TypeError('data phải là object')`.

```js
const validateProduct = createValidator({
  sku: { type: 'string', required: true, pattern: /^[A-Z0-9-]+$/ },
  price: { type: 'number', required: true, min: 0 },
  tags: { type: 'array' },
});

validateProduct({ sku: 'TSHIRT-01', price: 150000 });
// { valid: true, errors: [] }

validateProduct({ sku: 'áo thun', price: -1 });
// { valid: false, errors: [
//   { field: 'sku', rule: 'pattern', message: '...' },
//   { field: 'price', rule: 'min', message: '...' },
// ] }
```

## Chạy

```bash
npm run check w2-12
npm run watch w2-12
```

## Tự kiểm tra sau khi đạt

Vì sao `createValidator` trả về **hàm** thay vì nhận luôn `(schema, data)`? Trong một API có 10 endpoint dùng
chung schema sản phẩm, cách nào tiện hơn?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết hàm phụ `checkField(value, rules)` trả về tên luật đầu tiên bị vi phạm hoặc `null`. Mỗi luật là một `if` có
`return` sớm, xếp đúng thứ tự trong đề. `validate` chỉ cần duyệt `Object.entries(schema)` và gom lỗi.

</details>
