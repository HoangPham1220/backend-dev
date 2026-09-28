# nc-07 · Stream và backpressure: xuất 50.000 đơn ra CSV

**Mục tiêu:** xuất dữ liệu lớn bằng stream với `pipeline` và `Transform`, để bộ nhớ không phình theo số dòng dù nơi
nhận (file, HTTP response, S3) chậm hơn nơi đọc.

## Vì sao quan trọng khi đi làm

"Xuất tất cả đơn hàng ra CSV" là tính năng admin nào cũng có. Cách ngây thơ: lấy hết đơn vào mảng, nối thành một
chuỗi khổng lồ, rồi `res.end(csv)`. Với 2 triệu đơn, process hết RAM và bị kill. Magento cũng gặp đúng chuyện này
với export lớn.

Stream xử lý từng phần. **Backpressure** là cơ chế để nơi nhận chậm "bảo" nơi đọc dừng lại: `writable.write()` trả
`false` khi bộ đệm đầy, và phải chờ sự kiện `drain` mới ghi tiếp. Tự viết vòng lặp `for await ... write()` mà bỏ qua
giá trị trả về là lỗi kinh điển. `stream.pipeline` lo việc đó cho bạn, và còn dọn dẹp mọi stream khi một stream lỗi.

## Yêu cầu

### 1. `createCsvTransform(columns)`

Trả một `Transform`: phía ghi nhận **object** (`writableObjectMode: true`), phía đọc ra **chuỗi CSV**.

- Dòng đầu là header = tên các cột nối bằng dấu phẩy. Không có dòng dữ liệu nào vẫn phải ra header.
- Mỗi object → một dòng, lấy giá trị theo thứ tự `columns`, kết thúc bằng `\n`.
- Escape: giá trị chứa `,` `"` `\r` hoặc `\n` → bọc trong `"..."`, dấu `"` bên trong nhân đôi thành `""`.
- `null`/`undefined` → ô rỗng.

```js
// columns ['id', 'customer', 'note']
{ id: 1, customer: 'Nguyễn, Văn A', note: 'Giao "gấp"' }  →  1,"Nguyễn, Văn A","Giao ""gấp"""
```

### 2. `createLineCounter()`

Trả một `Transform` cho dữ liệu đi qua **nguyên vẹn**, đồng thời đếm số ký tự `\n` vào thuộc tính `.count`
(một chunk có thể chứa nhiều dòng hoặc không có dòng nào).

### 3. `exportOrdersCsv(source, writable, { columns = ['id', 'customer', 'total', 'status'] })`

- `source` là async iterable các đơn hàng (ví dụ async generator đọc từ database theo trang).
- Nối `source → csv transform → line counter → writable` bằng `pipeline` của `node:stream/promises`.
- Trả về số **dòng dữ liệu** đã ghi (không tính header).
- Một stream lỗi → Promise reject, và các stream khác bị hủy (`pipeline` làm việc này).

## Chạy

```bash
npm run check nc-07
```

## Tự kiểm tra sau khi đạt

Trong test backpressure, nếu bạn thay `pipeline` bằng vòng lặp `for await (const order of source) csv.write(order)`
thì điều gì xảy ra với bộ nhớ? Làm sao dùng hàm này để trả CSV trực tiếp trong một HTTP response?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`new Transform({ writableObjectMode: true, transform(row, _enc, callback) { ... callback(null, line); } })`.
Header in ở lần `transform` đầu tiên, hoặc trong `flush` nếu chưa in lần nào. `pipeline` nhận trực tiếp async
generator làm stream đầu tiên.

</details>

## Đọc thêm

- Tài liệu Node: *Backpressuring in Streams*, `stream.pipeline`, `Readable.from`.
- Thư viện `csv-stringify`, `fast-csv`; với PostgreSQL có `pg-query-stream` và `COPY ... TO STDOUT`.
