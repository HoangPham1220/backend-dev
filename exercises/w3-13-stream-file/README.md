# w3-13 · Đọc file lớn bằng stream

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** đọc file theo từng dòng bằng stream thay vì nạp cả file vào bộ nhớ, và dùng `for await...of`.

## Bối cảnh

File export đơn hàng từ Shopify dạng **JSON Lines** (`.jsonl`): mỗi dòng là một JSON riêng.

```
{"id":1,"status":"paid","total":350000}
{"id":2,"status":"paid","total":120000}
dòng hỏng do export lỗi
{"id":3,"status":"paid","total":"abc"}
```

File thật có thể nặng vài GB. `readFileSync` nạp **cả file vào RAM** và chặn event loop trong lúc đọc. Stream đọc
từng khúc nhỏ (mặc định 64KB), xử lý xong khúc nào bỏ khúc đó. Bộ nhớ dùng gần như không đổi dù file lớn tới đâu.

## So với PHP

Giống `fopen` + `fgets` trong vòng `while` của PHP, thay vì `file_get_contents`. Khác biệt: trong Node, việc đọc
là bất đồng bộ nên dùng `for await (const line of rl)`.

## Yêu cầu

### `sumRevenueFromJsonl(filePath)` (async)

Bắt buộc dùng `fs.createReadStream` và `node:readline` (test sẽ kiểm tra).

- Đọc từng dòng. Bỏ qua dòng trống (chỉ có khoảng trắng); dòng trống không tính là dòng hỏng.
- Dòng hợp lệ: parse được JSON **và** `total` là số hữu hạn (`Number.isFinite`).
- Dòng hỏng: parse lỗi, hoặc `total` không phải số hữu hạn. Đếm số dòng hỏng, không throw.
- Trả về `{ revenue, orderCount, badLines }`:
  `revenue` là tổng `total` của các dòng hợp lệ, `orderCount` là số dòng hợp lệ.
- File không tồn tại → reject (lỗi có `code: 'ENOENT'`).

```js
await sumRevenueFromJsonl('orders.jsonl'); // { revenue: 470000, orderCount: 2, badLines: 2 }
```

## Chạy

```bash
npm run check w3-13
```

## Tự kiểm tra sau khi đạt

Với file 5GB, `readFileSync` + `split('\n')` sẽ gặp vấn đề gì? Còn cách dùng stream thì bộ nhớ phụ thuộc vào gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

```js
const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
for await (const line of rl) { /* ... */ }
```

Lỗi "file không tồn tại" xảy ra trên stream. Với `for await`, lỗi đó sẽ được ném ra từ vòng lặp, nên hàm async tự reject.

</details>
