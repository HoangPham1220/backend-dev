# w2-10 · Tự viết bộ đọc tham số dòng lệnh

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** xử lý mảng chuỗi theo trạng thái (đọc token, quyết định token sau là giá trị hay option mới),
làm nền cho CLI tồn kho ở bài lớn w2-50.

## So với PHP

- PHP: `$argv` (có cả tên script ở `$argv[0]`), hoặc `getopt()`. Magento CLI dùng Symfony Console.
- Node: `process.argv` gồm `[đường dẫn node, đường dẫn script, ...tham số]`. Tham số thật bắt đầu từ
  `process.argv.slice(2)`.

```bash
node inventory.js add --sku=A1 --qty 3 --dry-run
# process.argv.slice(2) = ['add', '--sku=A1', '--qty', '3', '--dry-run']
```

## Yêu cầu

### 1. `parseArgs(argv)`

Nhận mảng chuỗi (đã bỏ 2 phần tử đầu), trả `{ command, options }`.

Luật:

1. `argv[0]` là command. Không có, hoặc bắt đầu bằng `--` → `throw new Error('Thiếu command')`.
2. `--key=value` → `options.key = 'value'`. Chỉ tách ở dấu `=` **đầu tiên**: `--url=a=b` → `'a=b'`.
   `--note=` → chuỗi rỗng `''`.
3. `--key value` (token sau không bắt đầu bằng `--`) → `options.key = 'value'`.
4. `--flag` đứng cuối hoặc ngay trước một `--option` khác → `options.flag = true`.
5. Option lặp lại → giá trị sau cùng thắng.
6. Mọi giá trị giữ nguyên dạng chuỗi (không tự đổi `'3'` thành số).
7. Token không bắt đầu bằng `--` mà không phải giá trị của option nào (tham số thừa)
   → `throw new Error('Tham số thừa: <token>')`.

```js
parseArgs(['add', '--sku=A1', '--qty', '3', '--dry-run']);
// { command: 'add', options: { sku: 'A1', qty: '3', 'dry-run': true } }

parseArgs(['list']);
// { command: 'list', options: {} }
```

### 2. `getNumberOption(options, name, defaultValue)`

Lấy option dạng số:

- Không có option `name` → trả `defaultValue`. Nếu `defaultValue` cũng là `undefined` → `throw new Error('Thiếu --<name>')`.
- Có nhưng không phải số hữu hạn (`'abc'`, `''`, `true` do quên giá trị) → `throw new Error('--<name> phải là số')`.
- Ngược lại trả về số: `'3'` → `3`, `'2.5'` → `2.5`.

## Chạy

```bash
npm run check w2-10
npm run watch w2-10
```

## Tự kiểm tra sau khi đạt

Với `['add', '--dry-run', 'A1']`, vì sao theo luật trên `A1` lại thành giá trị của `dry-run`?
Các thư viện CLI thật xử lý nhập nhằng này thế nào? (gợi ý: chúng cần biết trước option nào là cờ boolean)

Làm xong, đọc tài liệu `parseArgs` có sẵn trong `node:util` và so sánh với bản của bạn.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Dùng vòng `for` với chỉ số `i` thay vì `for...of`, vì khi gặp `--key value` bạn cần đọc `argv[i + 1]`
rồi **nhảy qua** nó (`i += 1`). `indexOf('=')` và `slice` giúp tách ở dấu `=` đầu tiên.

</details>
