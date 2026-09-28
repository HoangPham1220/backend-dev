# w1-12 · Chuẩn hóa dữ liệu import sản phẩm

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** làm sạch dữ liệu đầu vào lộn xộn, gom lỗi theo từng dòng thay vì dừng ở lỗi đầu tiên.

Tình huống quen thuộc: khách gửi file CSV import sản phẩm, dữ liệu có khoảng trắng thừa, giá ghi kiểu `"1.250.000"`,
thiếu tên... Import của Magento báo lỗi theo từng dòng, bài này làm lại phần đó.

## So với PHP

- `str.trim()` giống `trim($str)`, `str.toUpperCase()` giống `strtoupper($str)`.
- `str.replaceAll('.', '')` giống `str_replace('.', '', $str)`.
- `Number('')` là `0`, không phải lỗi. `Number('12abc')` là `NaN`. Cẩn thận với chuỗi rỗng.
- `try { ... } catch (error) { error.message }` giống PHP `try/catch (\Exception $e) { $e->getMessage() }`.

## Yêu cầu

### 1. `normalizeProduct(raw)`

`raw` là một dòng đọc từ file (mọi giá trị có thể là chuỗi, có khoảng trắng thừa). Trả về **object mới**
`{ sku, name, price, stock }`, hoặc `throw new Error(message)` nếu dữ liệu sai:

| Trường | Chuẩn hóa | Lỗi (message chính xác) |
|---|---|---|
| `sku` | bỏ khoảng trắng hai đầu, viết hoa | rỗng hoặc thiếu → `'Thiếu sku'` |
| `name` | bỏ khoảng trắng hai đầu | rỗng hoặc thiếu → `'Thiếu tên sản phẩm'` |
| `price` | số nguyên `>= 0` giữ nguyên; chuỗi: bỏ khoảng trắng hai đầu, bỏ dấu chấm phân tách hàng nghìn, phần còn lại phải toàn chữ số | sai → `'Giá không hợp lệ: <giá trị gốc>'` |
| `stock` | thiếu hoặc chuỗi rỗng → `0`; chuỗi toàn chữ số → số; số nguyên `>= 0` giữ nguyên | sai → `'Tồn kho không hợp lệ: <giá trị gốc>'` |

Kiểm tra theo thứ tự `sku` → `name` → `price` → `stock`.

```js
normalizeProduct({ sku: ' ts-01 ', name: ' Áo thun ', price: '1.250.000', stock: '5' });
// { sku: 'TS-01', name: 'Áo thun', price: 1250000, stock: 5 }
normalizeProduct({ sku: 'A', name: 'Mũ', price: 'abc' });
// Error: Giá không hợp lệ: abc
```

### 2. `normalizeAll(rows)`

Chuẩn hóa cả danh sách, **không dừng ở lỗi đầu tiên**. Trả về:

```js
{
  valid: [ /* các sản phẩm đã chuẩn hóa, giữ thứ tự */ ],
  errors: [ { row: 2, message: 'Thiếu tên sản phẩm' } ],  // row đánh số từ 1
}
```

Thêm một luật: SKU (sau khi chuẩn hóa) xuất hiện lần thứ hai trở đi là lỗi `'Trùng sku: <SKU>'`, dòng đó không vào `valid`.

## Chạy

```bash
npm run check w1-12
```

## Tự kiểm tra sau khi đạt

Vì sao `normalizeProduct` ném lỗi, còn `normalizeAll` lại trả lỗi trong object? Khi nào nên ném lỗi, khi nào nên trả lỗi như dữ liệu?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết một hàm phụ `parseInteger(value)` trả số hoặc `null` khi không hợp lệ, dùng chung cho `price` và `stock`.
Kiểm tra "toàn chữ số" có thể dùng `/^\d+$/.test(str)`: `^` đầu chuỗi, `\d+` một hoặc nhiều chữ số, `$` cuối chuỗi.
Trong `normalizeAll`, bọc từng dòng trong `try/catch`, và dùng một `Set` để nhớ các sku đã gặp.

</details>
