# w4-02 · Đọc body JSON của request

**Mục tiêu:** hiểu request body là một **stream** đến theo từng mảnh (chunk), tự gom lại, parse JSON, và chặn body quá lớn.

## So với PHP

- PHP đọc sẵn body cho bạn: `$_POST`, hoặc `json_decode(file_get_contents('php://input'), true)`.
  Giới hạn kích thước do `post_max_size` trong php.ini lo.
- Node **không** đọc sẵn. `req` là một stream: dữ liệu đến qua sự kiện `'data'` (mỗi lần một `Buffer`),
  hết thì có sự kiện `'end'`. Giới hạn kích thước bạn tự lo, nếu không ai đó gửi 2GB là server hết RAM.
- Giới hạn tính theo **byte**, không phải số ký tự: `'ệ'` là 1 ký tự nhưng 3 byte UTF-8
  (`Buffer.byteLength('ệ')` → 3).

## Yêu cầu

Viết `readJsonBody(req, { limit = 1_048_576 } = {})` trả về **Promise**:

1. Body rỗng → resolve `{}`.
2. Body là JSON hợp lệ → resolve giá trị đã parse.
3. JSON hỏng → reject một `Error` có thuộc tính `status = 400`.
4. Tổng số byte **vượt** `limit` → reject `Error` có `status = 413` (bằng đúng `limit` vẫn hợp lệ).
5. Body có thể đến thành nhiều chunk; phải gom đủ rồi mới parse.

```js
const server = http.createServer(async (req, res) => {
  try {
    const body = await readJsonBody(req, { limit: 100 });
    res.end(JSON.stringify({ received: body }));
  } catch (err) {
    res.writeHead(err.status ?? 500);
    res.end(JSON.stringify({ error: err.message }));
  }
});
```

## Chạy

```bash
npm run check w4-02
npm run watch w4-02
```

## Trong Express

```js
app.use(express.json({ limit: '1mb' })); // middleware này làm đúng việc của readJsonBody
app.post('/orders', (req, res) => { console.log(req.body); });
```

JSON hỏng thì `express.json()` trả 400, quá lớn thì trả 413, y như bài này.

## Tự kiểm tra sau khi đạt

Vì sao phải `new Promise(...)` ở bài này, trong khi đa số hàm async khác chỉ cần `async/await`?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Trong `new Promise((resolve, reject) => { ... })`: lắng nghe `req.on('data', chunk => ...)` gom các chunk vào mảng
và cộng dồn `chunk.length` (số byte); `req.on('end', ...)` thì `Buffer.concat(chunks).toString('utf8')` rồi
`JSON.parse` trong `try/catch`. Tạo lỗi có status: `const err = new Error('...'); err.status = 400;`.

</details>
