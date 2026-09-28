# w9-02 · Viết test tích hợp cho API

**Mục tiêu:** viết test gọi API qua HTTP thật (test tích hợp), kiểm tra status code, body và cả những gì **không được** có trong response.

Giống w9-01, bài này bạn **viết test** trong `my.test.js`. Bộ chấm chạy test của bạn với bản API đúng (`lib/app.js`)
và 5 mutant trong `mutants/`. Test phải pass với bản đúng (ít nhất 6 test) và fail với mỗi mutant.

## Unit test và test tích hợp

- **Unit test** (w9-01): gọi thẳng một hàm, không có mạng, database.
- **Test tích hợp**: khởi động server thật, gửi request bằng `fetch`, kiểm tra response. Chậm hơn nhưng bắt được lỗi
  ở chỗ nối các phần: routing, status code, định dạng JSON, lộ dữ liệu.

`my.test.js` đã có sẵn phần dựng server: mỗi test có một server mới, dữ liệu trống (`beforeEach`), và server được
đóng sau test (`afterEach`). Bạn chỉ cần viết các `test(...)`.

## So với PHP

Giống Magento integration test hoặc Laravel `$this->postJson('/customers', [...])->assertStatus(201)`, chỉ khác là
ở đây gửi request HTTP thật tới server chạy trên cổng ngẫu nhiên.

## Đặc tả API

### `POST /customers`

Body JSON: `{ "email": "...", "name": "...", "password": "..." }`

| Trường hợp | Status | Body |
|---|---|---|
| Hợp lệ | `201` | `{ id, email, name }`, email lưu dạng chữ thường. **Không** có mật khẩu hay hash. |
| Email không chứa `@`, thiếu tên, mật khẩu dưới 8 ký tự, body không phải JSON | `400` | `{ error }` |
| Email đã tồn tại (**không phân biệt hoa thường**) | `409` | `{ error }` |

### `GET /customers/:id`

| Trường hợp | Status | Body |
|---|---|---|
| Có khách hàng | `200` | `{ id, email, name }`. **Không** có mật khẩu hay hash. |
| Không có | `404` | `{ error }` |

## Yêu cầu

Viết test trong `my.test.js` đủ để giết cả 5 mutant. Viết từ đặc tả trước, chỉ mở `mutants/` khi đã cố mà vẫn còn mutant sống.

Chạy riêng test của bạn: `node --test exercises/w9-02-test-api/my.test.js`.

## Khi đi làm

Với Express, người ta hay dùng `supertest` để gửi request mà không cần tự `listen`. Test tích hợp có database thì dùng
database riêng cho test, dọn dữ liệu giữa các test (giống `beforeEach` ở đây tạo server mới).
Kiểm tra "không lộ dữ liệu nhạy cảm" là loại test rất nên có trong mọi API thật.

## Chạy

```bash
npm run check w9-02
npm run watch w9-02
```

## Tự kiểm tra sau khi đạt

1. Vì sao mỗi test nên có server và dữ liệu mới, thay vì dùng chung một server cho cả file?
2. Mutant-3 trong thực tế là lỗi bảo mật gì? Test nào của bạn bắt được nó, và nó có bắt được nếu API trả thêm field `password_hash`?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Kiểm tra body bằng `assert.deepEqual(await res.json(), { id: 1, email: ..., name: ... })`: so sánh **toàn bộ** object
  sẽ bắt được field thừa, còn kiểm tra từng field thì không.
- Mỗi dòng trong bảng đặc tả là ít nhất một test. Chú ý "không phân biệt hoa thường" và giá trị biên 8 ký tự.

</details>
