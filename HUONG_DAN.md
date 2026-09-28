# Hướng dẫn học với project này

Tài liệu này giải thích cấu trúc thư mục và cách học hằng ngày.

Bạn học trên **hai repo**:

| Repo | Vai trò |
|---|---|
| `/var/www/html/personal-project/backend-dev` (repo này) | **Phòng tập:** bài tập rời để luyện từng kỹ năng, kế hoạch, theo dõi tiến độ, prompt cho AI |
| `/var/www/html/personal-project/voltix-store` | **Project thật:** cửa hàng đồ điện tử Voltix. Bạn làm ticket để hoàn thiện backend. Đây là project đưa vào CV |

Nhịp chung mỗi tuần: **luyện ở phòng tập → áp dụng vào ticket Voltix**.
Kế hoạch chi tiết: [LEARNING_CONTEXT.md](LEARNING_CONTEXT.md) · Tra cứu lệnh nhanh: [README.md](README.md) ·
Phần nâng cao (tùy chọn): [NANG_CAO.md](NANG_CAO.md).

## 1. Cấu trúc thư mục

```
backend-dev/
│
├── LEARNING_CONTEXT.md   ← KẾ HOẠCH: mục tiêu, lộ trình 13 tuần, nguyên tắc dạy
├── HUONG_DAN.md          ← file này
├── NANG_CAO.md           ← mục nâng cao: bài nc-XX, mốc M6–M8, công cụ thực tế
├── PROGRESS.md           ← BẠN GHI: nhật ký tiến độ, cập nhật mỗi Chủ nhật
├── REVIEW.md             ← BẠN GHI: câu hỏi ôn cách quãng
├── README.md             ← tra cứu lệnh nhanh
│
├── exercises/            ← NƠI BẠN CODE (63 bài tuần 1–9 + 15 bài nâng cao nc-XX)
│   ├── w1-01-ham-va-dieu-kien/
│   ├── ...
│   └── w9-02-test-api/
│
├── du-an-lon/            ← (tùy chọn) API tự dựng từ đầu, đã được Voltix thay thế
│
├── prompts/              ← prompt mẫu, dán được vào mọi AI
├── .claude/commands/     ← slash command cho Claude Code (bọc các prompt trên)
├── scripts/              ← công cụ check/list/context/du-an, không cần đụng tới
├── CLAUDE.md             ← luật cho Claude khi làm việc trong repo này
└── package.json          ← khai báo các lệnh npm
```

```
voltix-store/
│
├── README.md             ← cách chạy (bạn viết lại cho CV ở VX-30)
├── tickets/              ← ĐỀ BÀI: VX-01 → VX-33 + README.md (bảng ticket theo tuần)
├── docs/
│   ├── QUY_TRINH.md      ← ĐỌC ĐẦU TIÊN: cách làm ticket, đăng nhập tạm, xử lý sự cố
│   ├── ARCHITECTURE.md   ← kiến trúc, luật chia tầng, định dạng lỗi
│   ├── API.md            ← hợp đồng API (frontend dựa vào đây)
│   ├── DATABASE.md       ← thiết kế database
│   └── adr/              ← quyết định kiến trúc do BẠN viết (VX-28 → VX-30)
├── src/                  ← NƠI BẠN CODE: chỗ nào ném NotImplementedError('VX-NN') là việc của bạn
│   ├── domain/           ← logic thuần (tuần 1–3)
│   ├── routes/ services/ repositories/   ← API, nghiệp vụ, SQL (tuần 4 trở đi)
│   └── db/migrations/    ← bạn viết 002, 003... (tuần 5 trở đi)
├── tests/
│   ├── tickets/          ← test chấm từng ticket (không sửa)
│   ├── learner/          ← test BẠN viết (VX-25)
│   └── provided/         ← test phần dựng sẵn, luôn phải đạt
├── frontend/             ← giao diện dựng sẵn
└── scripts/              ← ticket, board, demo-login, import sản phẩm
```

Chia theo việc bạn làm với từng thứ:

- **Đọc để định hướng:** `LEARNING_CONTEXT.md`, `HUONG_DAN.md`, `README.md`; bên Voltix là `docs/QUY_TRINH.md`
  và `tickets/README.md`.
- **Tự ghi:** `PROGRESS.md`, `REVIEW.md`.
- **Viết code:** `exercises/*/exercise.js` (và `lib/` nếu bài có); bên Voltix là `src/`, `tests/learner/`,
  `docs/adr/`.
- **Không sửa:** mọi file `*.test.js` chấm bài (`exercises/*/exercise.test.js`, `voltix-store/tests/tickets/`),
  `scripts/`.

## 2. Bên trong một bài tập

Bài cơ bản có 3 file:

| File | Vai trò | Bạn làm gì |
|---|---|---|
| `README.md` | Đề bài: mục tiêu, so với PHP, yêu cầu có ví dụ, câu "Tự kiểm tra", gợi ý mức 1 (ẩn) | Đọc kỹ trước khi code |
| `exercise.js` | Khung code có `// TODO` | **Viết code vào đây** |
| `exercise.test.js` | Test chấm bài | Không sửa. Được đọc để hiểu yêu cầu |

Một số bài có thêm file:

- **Bài lớn** (`w1-50`, `w2-50`...) có thêm `lib/` gồm nhiều file khung. Bạn code cả trong `lib/`.
- **Bài SQL** (tuần 5–6) có thêm `seed.sql` là dữ liệu mẫu, và `thu-sql.js` để chạy thử câu SQL trước khi nộp.
- **Bài tuần 9:**
  - Bạn viết test vào `my.test.js`.
  - `mutants/` chứa các bản code có bug mà test của bạn phải bắt được.
- **Bài sửa bug** (`w1-09`, `w2-07`, `w3-08`) không có `TODO`: `exercise.js` là code lỗi có sẵn, bạn tìm chỗ sai và sửa.

Loại bài hiện ngay trong `npm run list`:

| Nhãn | Ý nghĩa |
|---|---|
| (không nhãn) | Bài chính, làm hết |
| `(luyện thêm)` | Tùy chọn: khi còn thời gian hoặc thấy chủ đề đó chưa vững |
| `★ BÀI LỚN` | Bài ghép kiến thức cuối tuần (3–6 giờ), nên làm |
| `(nâng cao)` | Bài `nc-XX` ở cuối danh sách: chỉ làm khi đã vững phần lõi, xem [NANG_CAO.md](NANG_CAO.md) |

Thứ tự ưu tiên khi thiếu thời gian: **ticket Voltix → bài chính → bài lớn → bài luyện thêm**.
Bài chính giúp làm ticket nhanh hơn; nếu đã tự làm được ticket thì bài chính cùng chủ đề có thể lướt.
`npm run check` không kèm tên bài sẽ tự bỏ qua bài luyện thêm.

## 3. Cách học

### Một bài

```
Đọc README → tự viết code → npm run check wN-XX
                 ↑                    │
                 └── đọc expected/actual, sửa ──┘ (trượt)
                                      │ (đạt)
                    Trả lời câu "Tự kiểm tra" bằng lời
                                      │
               Không giải thích được → chưa tính là xong
```

- Dùng `npm run watch wN-XX` để tự chấm lại mỗi lần lưu file, không phải gõ lại lệnh.
- **Kẹt 20–30 phút** mới mở "Gợi ý mức 1" trong README. Vẫn kẹt thì hỏi AI để xin gợi ý, không xin đáp án.
- Test trượt là thông tin, không phải thất bại. Tập đọc dòng `expected/actual` và stack trace, đây là kỹ năng
  đi làm dùng hằng ngày.

### Một ngày

1. **Đầu buổi (5–10 phút):** trả lời các câu đến hạn trong `REVIEW.md`, không nhìn tài liệu.
   Hoặc gõ `/bat-dau-buoi`.
2. **Giữa buổi:** làm bài. Phần lớn thời gian là viết code. Chỉ đọc tài liệu (javascript.info, MDN,
   Node docs) phục vụ đúng bài đang làm.
3. **Cuối buổi:** cái gì hôm nay thấy chưa chắc thì thêm 1–2 câu hỏi vào `REVIEW.md`, ngày ôn là ngày mai.

### Một tuần

- **Đầu tuần:** làm bài chính của tuần trong `exercises/` để luyện kỹ năng.
- **Giữa và cuối tuần:** làm các ticket Voltix của tuần (xem bảng dưới). Ticket được ưu tiên khi thiếu thời gian.
- **Còn thời gian:** bài luyện thêm hoặc bài lớn của chủ đề còn yếu.
- **Chủ nhật:** gõ `/tong-ket-tuan`, đối chiếu với tiêu chí tuần trong `LEARNING_CONTEXT.md`,
  cập nhật `PROGRESS.md`.

### 13 tuần: luyện gì, làm ticket nào

| Tuần | Luyện ở `backend-dev/exercises` | Ticket Voltix |
|---|---|---|
| 1 | w1 bài chính | VX-01 giỏ hàng, VX-02 tính tiền, VX-03 mã giảm giá |
| 2 | w2 bài chính | VX-04 kiểm tra dữ liệu, VX-05 bảo hành, VX-06 bug URL tiếng Việt |
| 3 | w3 bài chính | VX-07 phí vận chuyển (async, retry), VX-08 nhập CSV (stream) |
| 4 | w4-01 → w4-05 | VX-09 → VX-13: API sản phẩm, quản trị sản phẩm, 2 bug |
| 5 | w5 bài chính | VX-14 migration đơn hàng, VX-15 báo giá giỏ hàng |
| 6 | w6-01, w6-02 | VX-16 → VX-20: đặt hàng, đơn của tôi, tồn kho, thống kê, bug N+1 |
| 7 | — | VX-21 kiểm tra kiểu TypeScript |
| 8 | w8 bài chính | VX-22 → VX-24: đăng nhập, phân quyền, bug lộ mật khẩu |
| 9 | w9 bài chính | VX-25 viết test bắt mutant |
| 10 | — | VX-26 thanh toán + webhook, VX-27 Docker; deploy, **bắt đầu nộp CV** |
| 11 | — | VX-28 → VX-30: tự thiết kế đánh giá, bảo hành/đổi trả, ADR + README |
| 12–13 | ôn phỏng vấn | (VX-31 → VX-33 nâng cao nếu dư thời gian) |

Các bài `(luyện thêm)`, bài lớn `wN-50`, `w4-06`, `w6-03` và `du-an-lon/` đều **tùy chọn**,
vì Voltix đã phủ cùng kỹ năng trong bối cảnh thật.

### Làm ticket Voltix

Chi tiết: `voltix-store/docs/QUY_TRINH.md`. Mỗi file đề `tickets/VX-NN-*.md` có: bối cảnh, yêu cầu, tiêu chí
nghiệm thu, "Bắt đầu từ đâu", bài luyện trước trong `backend-dev/exercises`, liên hệ PHP/Magento, gợi ý mức 1
(ẩn) và câu hỏi tự kiểm tra. Ticket **Bug** chỉ mô tả hiện tượng như khách báo; bạn tự tìm nguyên nhân.

Tóm tắt các lệnh:

```bash
cd /var/www/html/personal-project/voltix-store
git switch -c vx-01-gio-hang     # mỗi ticket một nhánh
# đọc tickets/VX-01-*.md, viết code
npm run ticket 1                 # chấm ticket
npm test                         # chắc không hỏng chỗ khác
git commit -am "VX-01: chuẩn hoá giỏ hàng"
git switch main && git merge --no-ff vx-01-gio-hang
npm run board                    # bảng trạng thái mọi ticket
npm run demo-login               # đăng nhập tạm trên giao diện trước VX-22 (xem QUY_TRINH.md)
```

Hai điều dễ bối rối:

- **Test "skipped"** kèm lời nhắc `Bật sau khi làm VX-23`: test đó cần ticket của tuần sau, tự bỏ qua cho tới khi
  bạn làm tới. Ticket vẫn tính là đạt.
- **`npm test` đỏ rất nhiều** khi mới làm vài ticket là bình thường. Hằng ngày dùng `npm run ticket NN`.

## 4. Làm việc với AI

### Trong Claude Code

Mở Claude Code ở `backend-dev` hoặc `voltix-store` đều được. Ở `voltix-store` chỉ có các lệnh `/bat-dau-buoi`,
`/cham-ticket`, `/goi-y-ticket`, `/tong-ket-tuan`; các lệnh bài tập rời chỉ có ở `backend-dev`.

| Lệnh | Khi nào dùng |
|---|---|
| `/bat-dau-buoi` | Đầu mỗi buổi |
| `/cham-bai w1-03` | Làm đạt rồi, muốn được review cách viết |
| `/goi-y w1-03` | Kẹt quá 20–30 phút |
| `/bai-bien-the w1-03` | Đạt rồi nhưng muốn chắc là mình hiểu thật |
| `/tao-bai-tap ...` | Cần thêm bài cho một chủ đề |
| `/tong-ket-tuan` | Chủ nhật |
| `/cham-ticket VX-09` | Review code ticket Voltix (đọc diff nhánh so với `main`, chạy test ticket) |
| `/goi-y-ticket VX-09` | Kẹt ở ticket Voltix, xin gợi ý theo mức |

Claude sẽ tự chạy test thật, **không sửa code của bạn** và không lộ nguyên nhân ticket Bug khi bạn chưa hỏi.
Luật này ghi trong `CLAUDE.md` của cả hai repo.

### Với AI khác (khi hết lượt Claude)

```bash
npm run context goi-y w1-03
```

Lệnh này gộp context học tập, đề bài, code của bạn và kết quả test vào `.context-bundle.md`.
Mở file, copy và dán vào ChatGPT hoặc Gemini là họ nắm đủ bối cảnh.
Tên prompt thay được bằng `cham-bai`, `bat-dau-buoi`, `tong-ket-tuan`... (xem thư mục `prompts/`).

Với ticket Voltix: `npm run context cham-bai VX-09` (hoặc `goi-y VX-09`) gộp đề ticket, phần code bạn đã
thay đổi so với nhánh `main` và kết quả `npm run ticket 9`.

## 5. Ngày 01/10 bắt đầu như sau

**Phòng tập (khoảng 1 giờ)**

1. `cd /var/www/html/personal-project/backend-dev`, chạy `git init`, commit lần đầu.
2. Gõ `/bat-dau-buoi` để ôn 5 câu có sẵn trong `REVIEW.md`.
3. Làm `w1-01`, rồi `w1-02` (đoán kết quả trước, chạy sau). Hai bài này cho biết phần nào lướt nhanh được.

**Voltix (phần còn lại của buổi)**

4. Chạy project lần đầu:
   ```bash
   cd /var/www/html/personal-project/voltix-store
   docker compose up -d
   npm install
   npm run db:migrate && npm run db:seed
   npm run dev
   ```
5. Mở http://localhost:3000 và đi một vòng. Trang sản phẩm sẽ hiện 🚧 VX-09: cả cửa hàng đang chờ bạn làm.
6. `git init`, `git add -A`, commit "Trạng thái ban đầu". File `.env` đã nằm trong `.gitignore`.
7. Đọc `docs/QUY_TRINH.md` và `tickets/README.md`, rồi làm VX-01 theo đúng quy trình: tạo nhánh → code →
   `npm run ticket 1` → tự review → merge.

Cuối tuần 1, `npm run board` phải có ✅ ở VX-01, VX-02, VX-03.
