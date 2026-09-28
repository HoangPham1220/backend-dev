# w2-11 · Đọc và ghi CSV sản phẩm

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** tự xử lý chuỗi theo từng ký tự khi luật tách không đơn giản, và kết hợp với đọc file.

Import/export sản phẩm bằng CSV là việc bạn gặp nhiều ở Magento (System → Data Transfer). Bài này tự viết
phiên bản nhỏ để hiểu vì sao `line.split(',')` là **không đủ**.

## So với PHP

PHP có sẵn `fgetcsv()` / `str_getcsv()` / `fputcsv()`. Node **không** có hàm CSV sẵn: đi làm thường cài thư viện
(ví dụ `csv-parse`). Tự viết một lần để hiểu thư viện đó xử lý gì cho bạn.

## Yêu cầu

### 1. `parseCsv(text)`

- Dòng đầu là header. Mỗi dòng sau thành một object `{ header: giá trị }`, giá trị là **chuỗi**.
- Dòng cách nhau bằng `\n` hoặc `\r\n` (file từ Windows/Excel). Bỏ qua dòng trống ở cuối file.
- Ô nằm trong ngoặc kép `"..."` được chứa dấu phẩy. Trong ô có ngoặc kép, `""` nghĩa là một ký tự `"`.
- Không cần hỗ trợ xuống dòng bên trong ô.
- Dòng có số ô khác số cột header → `throw new Error('Dòng <n> có <x> cột, cần <y>')`, trong đó `n` là số thứ tự
  dòng trong file, tính từ 1 (header là dòng 1).

```js
parseCsv('sku,name,price\nA1,"Áo thun, cotton",150000\n');
// [{ sku: 'A1', name: 'Áo thun, cotton', price: '150000' }]

parseCsv('sku,note\nB2,"Size ""L"""');
// [{ sku: 'B2', note: 'Size "L"' }]
```

### 2. `toCsv(rows, columns)`

- Dòng đầu là `columns` nối bằng dấu phẩy, sau đó mỗi row một dòng theo đúng thứ tự `columns`.
- `null` / `undefined` → ô rỗng. Giá trị khác đổi sang chuỗi.
- Ô chứa `,` hoặc `"` hoặc xuống dòng → bọc trong `"..."` và nhân đôi mọi `"` bên trong.
- Các dòng nối bằng `\n`, **không** có `\n` ở cuối.

```js
toCsv([{ sku: 'A1', name: 'Áo thun, cotton', price: 150000 }], ['sku', 'name', 'price']);
// 'sku,name,price\nA1,"Áo thun, cotton",150000'
```

### 3. `importProductsCsv(filePath)`

Đọc file CSV (UTF-8, đồng bộ), trả mảng sản phẩm, trong đó cột `price` và `stock` đổi sang số.
Giá trị `price` hoặc `stock` không phải số (kể cả ô rỗng) → `throw new Error('Sản phẩm <sku>: <cột> không hợp lệ')`.

## Chạy

```bash
npm run check w2-11
npm run watch w2-11
```

## Tự kiểm tra sau khi đạt

`toCsv` rồi `parseCsv` lại có luôn ra đúng dữ liệu ban đầu không? Trường hợp nào không, và vì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Viết hàm phụ `parseLine(line)` duyệt từng ký tự với một biến trạng thái `inQuotes` (đang ở trong ngoặc kép hay
không). Gặp `,` khi `inQuotes === false` thì kết thúc một ô. Gặp `"` khi đang trong ngoặc: nếu ký tự sau cũng là
`"` thì đó là ký tự `"` thật, ngược lại là đóng ngoặc.

</details>
