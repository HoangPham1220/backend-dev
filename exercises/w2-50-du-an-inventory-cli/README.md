# w2-50 · Dự án: CLI quản lý tồn kho

> BÀI TẬP LỚN cuối tuần 2 (3–5 giờ).

**Mục tiêu:** tự xây một chương trình Node hoàn chỉnh chạy từ dòng lệnh, chia module, đọc/ghi file, đọc biến môi
trường, xử lý lỗi và trả exit code đúng. Dùng lại mọi thứ của tuần 1–2.

Test **không** gọi hàm của bạn trực tiếp mà **chạy chương trình thật** như người dùng gõ lệnh, rồi kiểm tra
stdout, stderr, exit code và file dữ liệu. Nghĩa là cấu trúc bên trong do bạn tự quyết định.

## Cách chạy chương trình

```bash
export INVENTORY_FILE=/tmp/inventory.json
node exercises/w2-50-du-an-inventory-cli/exercise.js add --sku TSHIRT --qty 10 --name "Áo thun"
node exercises/w2-50-du-an-inventory-cli/exercise.js list --low-stock=5
```

## Yêu cầu chung

- Đường dẫn file dữ liệu lấy từ biến môi trường `INVENTORY_FILE`. Thiếu biến này → lỗi, message chứa `INVENTORY_FILE`.
- File dữ liệu là JSON: **mảng** `[{ "sku": "...", "name": "...", "qty": 3 }]`, luôn **sắp xếp theo sku tăng dần**.
  File chưa tồn tại thì coi như kho rỗng (tạo file khi ghi lần đầu).
- **Thành công:** in kết quả ra **stdout** dạng JSON, stderr để trống, exit code `0`.
- **Lỗi:** in message ra **stderr**, exit code `1`, **không** thay đổi file dữ liệu.
- Thiếu command → lỗi. Command không có trong danh sách dưới → lỗi, message chứa `Lệnh không hợp lệ`.

## Các lệnh

### `add --sku <sku> --qty <n> [--name <tên>]`

- Thiếu `--sku` → lỗi, message chứa `sku`.
- `--qty` phải là số nguyên dương. Thiếu hoặc sai → lỗi, message chứa `qty`.
- Sku chưa có: thêm mới, không có `--name` thì `name` = sku.
- Sku đã có: cộng thêm `qty`. Có `--name` thì cập nhật tên, không có thì giữ tên cũ.
- stdout: item sau khi cập nhật, ví dụ `{"sku":"TSHIRT","name":"Áo thun","qty":10}`.

### `remove --sku <sku> --qty <n>`

- `--sku`, `--qty` kiểm tra như lệnh `add`.
- Sku không tồn tại, hoặc tồn kho ít hơn `qty` → lỗi, message chứa `Không đủ hàng`.
- Về 0 thì **giữ** item với `qty: 0` (để còn hiện trong danh sách sắp hết hàng).
- stdout: item sau khi cập nhật.

### `list [--low-stock=<n>]`

- stdout: mảng mọi item (sắp theo sku). Kho rỗng → `[]`.
- Có `--low-stock=n`: chỉ các item có `qty < n`.

### `export --format=csv --out=<đường dẫn>`

- Chỉ hỗ trợ `csv`. Format khác hoặc thiếu → lỗi, message chứa `format`. Thiếu `--out` → lỗi, message chứa `out`.
- Ghi file CSV: dòng đầu `sku,name,qty`, mỗi item một dòng, sắp theo sku. Tên chứa dấu phẩy hoặc ngoặc kép phải
  được escape như bài w2-11.
- stdout: `{"exported": <số item>, "out": "<đường dẫn>"}`.

## Cấu trúc gợi ý

Khung đã có sẵn file, bạn được đổi tùy ý:

| File | Việc |
|---|---|
| `exercise.js` | Điểm vào: đọc `process.argv`, `process.env`, gọi các module, in kết quả, đặt `process.exitCode` |
| `lib/args.js` | `parseArgs(argv)`: có thể dùng lại bài w2-10 |
| `lib/store.js` | `loadInventory(filePath)`, `saveInventory(filePath, items)` |
| `lib/commands.js` | Logic từng lệnh, **không** đọc `process.env` hay in ra màn hình, lỗi thì `throw` |

Nguyên tắc: chỉ `exercise.js` được chạm vào `process`. Các module trong `lib/` nhận dữ liệu qua tham số, nhờ vậy
dễ test và dễ dùng lại khi chuyển thành API ở tuần 4.

## Chạy

```bash
npm run check w2-50
npm run watch w2-50
```

## Tự kiểm tra sau khi đạt

1. Vì sao lỗi phải ra **stderr** và exit code khác 0? Một script shell gọi CLI của bạn dựa vào đâu để biết lệnh thất bại?
2. Nếu tuần sau cần làm HTTP API `POST /inventory/add` cùng logic, bạn dùng lại được những file nào mà không sửa?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Bọc toàn bộ phần chạy lệnh trong một `try/catch` ở `exercise.js`: `catch` thì `console.error(error.message)` và
  `process.exitCode = 1`.
- Để "lỗi thì không đổi file": tính xong kết quả mới trong bộ nhớ, **chỉ ghi file ở bước cuối** khi không có lỗi.
- Thử tay trước khi chạy test: `INVENTORY_FILE=/tmp/inv.json node exercises/w2-50-du-an-inventory-cli/exercise.js list`,
  rồi `echo $?` để xem exit code.

</details>
