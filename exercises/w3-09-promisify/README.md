# w3-09 · Từ callback sang Promise (promisify)

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** hiểu kiểu callback `(err, result)` của Node cũ và tự bọc nó thành Promise để dùng với `await`.

## So với PHP

PHP không có kiểu này. Trước khi có Promise, Node viết code bất đồng bộ bằng **callback kiểu Node** (error-first):

```js
fs.readFile('products.json', 'utf8', (err, text) => {
  if (err) return console.error('Lỗi:', err);
  console.log(text);
});
```

- Tham số cuối là callback. Callback nhận `err` trước; không lỗi thì `err` là `null` và `result` ở vị trí thứ hai.
- Nhiều thư viện cũ (và một phần API của Node) vẫn dùng kiểu này. Bạn cần biết đọc và biết chuyển nó sang Promise.

## Yêu cầu

### 1. `promisify(fn)`

Nhận một hàm callback kiểu Node, trả về **hàm mới** trả Promise:

- Gọi hàm mới với các tham số bình thường (không có callback): `promisify(fn)(a, b)` sẽ gọi `fn(a, b, callback)`.
- `callback(err)` có lỗi → Promise reject với `err`.
- `callback(null, result)` → Promise resolve với `result`.

```js
const readFileAsync = promisify(fs.readFile);
const text = await readFileAsync('products.json', 'utf8');
```

### 2. `readJsonCallback(filePath, callback)`

Viết **theo kiểu callback** (không dùng `async`/`await`, không dùng `fs/promises`), dùng `fs.readFile` bản callback:

- Đọc file (utf8), parse JSON, gọi `callback(null, data)`.
- Đọc file lỗi → `callback(err)` với lỗi gốc của `fs` (giữ nguyên `err.code`, ví dụ `'ENOENT'`).
- JSON hỏng → `callback(err)` với lỗi `SyntaxError` của `JSON.parse`.
- `callback` chỉ được gọi **đúng một lần**.

### 3. `loadConfig(filePath)` (async)

Dùng `promisify` và `readJsonCallback` của bạn để đọc file cấu hình, trả về object cấu hình đã gộp với giá trị mặc định
`{ currency: 'VND', pageSize: 20 }` (giá trị trong file ghi đè mặc định). File lỗi → reject.

```js
// config.json: { "pageSize": 50, "shopName": "Demo" }
await loadConfig('config.json'); // { currency: 'VND', pageSize: 50, shopName: 'Demo' }
```

## Chạy

```bash
npm run check w3-09
```

## Tự kiểm tra sau khi đạt

1. Vì sao `callback` có thể bị gọi **hai lần** nếu bạn đặt `callback(null, JSON.parse(text))` trong `try` và gọi
   `callback(err)` trong `catch`? (Gợi ý: nếu chính `callback` throw thì sao?)
2. Sau khi đạt, đọc về `node:util` → `util.promisify` và module `node:fs/promises`. Trong code mới, bạn sẽ dùng
   cách nào để đọc file? Vì sao?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

`promisify` trả về một hàm `(...args) => new Promise((resolve, reject) => { ... })`. Bên trong, gọi `fn(...args, (err, result) => { ... })`.

Với `readJsonCallback`: parse JSON trong `try/catch`, lưu kết quả vào biến, rồi mới gọi `callback` **bên ngoài** `try`.

</details>
