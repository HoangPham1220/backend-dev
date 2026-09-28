# w2-05 · Đọc và ghi file: xuất danh sách sắp hết hàng

**Mục tiêu:** dùng module `fs` có sẵn của Node để đọc file JSON, xử lý dữ liệu và ghi kết quả ra file mới.

## So với PHP

| PHP | Node.js |
|---|---|
| `file_get_contents($path)` | `readFileSync(path, 'utf8')` |
| `file_put_contents($path, $data)` | `writeFileSync(path, data)` |
| `file_exists($path)` | `existsSync(path)` |
| `json_decode($str, true)` | `JSON.parse(str)` |
| `json_encode($data, JSON_PRETTY_PRINT)` | `JSON.stringify(data, null, 2)` |

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
```

- Tiền tố `node:` cho biết đây là module có sẵn của Node, không phải package cài từ npm.
- Nhớ truyền `'utf8'`. Thiếu nó thì `readFileSync` trả về `Buffer` (dữ liệu nhị phân) thay vì chuỗi.
- Các hàm `...Sync` chạy **đồng bộ**: chương trình đứng chờ đọc xong mới chạy tiếp, giống PHP.
  Tuần 3 sẽ học bản bất đồng bộ (`fs/promises`), là cách dùng chuẩn trong server.
- `JSON.parse` gặp chuỗi JSON hỏng sẽ **throw** `SyntaxError`. PHP thì `json_decode` trả về `null` mà không báo lỗi.

## Yêu cầu

File sản phẩm có dạng:

```json
[
  { "sku": "TSHIRT", "name": "Áo thun", "stock": 3 },
  { "sku": "CAP", "name": "Mũ lưỡi trai", "stock": 25 }
]
```

### 1. `loadProducts(filePath)`

- Đọc file, trả về mảng sản phẩm.
- File không tồn tại → `throw new Error(...)`, message **chứa đường dẫn file** để người đọc log biết file nào thiếu.

### 2. `exportLowStock(inputPath, outputPath, threshold)`

- Đọc sản phẩm từ `inputPath` (dùng lại `loadProducts`).
- Lọc sản phẩm có `stock < threshold`, giữ nguyên thứ tự.
- Ghi ra `outputPath` dạng JSON thụt lề 2 dấu cách (`JSON.stringify(data, null, 2)`).
- Trả về **số sản phẩm** đã ghi.

```js
exportLowStock('products.json', 'low-stock.json', 10); // 1  (chỉ TSHIRT)
```

## Chạy

```bash
npm run check w2-05
npm run watch w2-05
```

## Tự kiểm tra sau khi đạt

Nếu file JSON đầu vào bị hỏng (thiếu dấu `]`), hàm `loadProducts` của bạn làm gì? So với PHP thì khác ở đâu?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Kiểm tra `existsSync(filePath)` trước, không có thì throw với template literal: `` `Không tìm thấy file: ${filePath}` ``.
Sau đó `JSON.parse(readFileSync(filePath, 'utf8'))`. Phần lọc dùng `filter` như tuần 1.

</details>
