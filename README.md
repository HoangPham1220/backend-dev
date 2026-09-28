# backend-dev

Lộ trình tự học Node.js backend 01/10 – 31/12/2026. Chi tiết mục tiêu và lộ trình: [LEARNING_CONTEXT.md](LEARNING_CONTEXT.md).

**Mới bắt đầu? Đọc [HUONG_DAN.md](HUONG_DAN.md) trước:** cấu trúc thư mục và cách học hằng ngày.

Project chính (đưa vào CV) nằm ở repo riêng `../voltix-store`: cửa hàng đồ điện tử, bạn làm ticket để hoàn thiện backend.
Repo này là phòng tập: bài tập rời, kế hoạch, theo dõi tiến độ.
Đã vững phần lõi: [NANG_CAO.md](NANG_CAO.md).

Cần Node.js 22 trở lên. Không cần `npm install`: mọi thứ dùng thư viện có sẵn của Node.

## Làm bài tập

```bash
npm run list            # bảng tiến độ mọi bài
npm run check           # chấm bài đầu tiên chưa đạt
npm run check w1-03     # chấm một bài cụ thể
npm run watch w1-03     # tự chấm lại mỗi lần lưu file (Ctrl+C để thoát)
```

Quy trình một bài:

1. Đọc `exercises/wN-XX-*/README.md`.
2. Viết code vào `exercise.js`. **Không sửa `exercise.test.js`.**
3. Chạy `npm run check wN-XX`, đọc dòng expected/actual khi trượt, sửa, chạy lại.
4. Đạt rồi thì trả lời câu "Tự kiểm tra" trong README bằng lời. Không giải thích được thì chưa tính là xong.
5. Kẹt quá 20–30 phút mới mở gợi ý mức 1 trong README, rồi mới hỏi AI.

### Ba loại bài

| Nhãn trong `npm run list` | Ý nghĩa |
|---|---|
| (không nhãn) | Bài chính của tuần. Làm hết. |
| `(luyện thêm)` | Tùy chọn: làm khi đã xong bài chính cùng chủ đề và còn thời gian, hoặc khi thấy chưa vững. `npm run check` không tham số sẽ bỏ qua loại này. |
| `★ BÀI LỚN` | Bài nhiều file cuối tuần (3–6 giờ). Nên làm: đây là nơi ghép kiến thức lại. |

Bài SQL (tuần 5–6) chạy trên SQLite có sẵn trong Node, không cần cài database. Trong thư mục bài có
`thu-sql.js` để chạy thử câu SQL trên dữ liệu mẫu.

## Dự án lớn tự dựng từ đầu (tùy chọn, đã được Voltix thay thế)

Đặc tả ở [du-an-lon/SPEC.md](du-an-lon/SPEC.md), gồm 5 mốc chính (55 test) và 3 mốc nâng cao (23 test) nghiệm thu gọi qua HTTP. Bạn tự chọn
cách làm (Express hay `node:http`, DB nào cũng được), miễn là qua test.

```bash
npm run du-an m1        # test mốc M1 (sản phẩm)
npm run du-an m1 m2     # nhiều mốc
npm run du-an           # các mốc chính M1–M5
npm run du-an all       # kể cả mốc nâng cao M6–M8
```

## Làm việc với AI

### Trong Claude Code (mở ở thư mục này)

| Lệnh | Việc |
|---|---|
| `/bat-dau-buoi` | Ôn câu đến hạn, chọn mục tiêu hôm nay |
| `/cham-bai w1-03` | Review code theo 4 bước |
| `/goi-y w1-03` | Gợi ý theo mức, không đưa đáp án |
| `/bai-bien-the w1-03` | Tạo bài biến thể để kiểm chứng |
| `/tao-bai-tap w4 express routing` | Soạn bài mới đúng định dạng repo |
| `/tong-ket-tuan` | Tổng kết tuần, cập nhật PROGRESS.md và REVIEW.md |

### Với AI khác (ChatGPT, Gemini, Claude web...)

`npm run context` gộp context học tập, tiến độ, câu ôn đến hạn (và bài tập nếu có) thành một prompt,
ghi vào `.context-bundle.md` rồi copy vào clipboard (cần `xclip` hoặc `wl-clipboard`; không có thì mở file để copy).

```bash
npm run context bat-dau-buoi          # đầu buổi
npm run context cham-bai w1-03        # nhờ review: kèm đề, code, test, kết quả test
npm run context goi-y w1-03           # đang kẹt
npm run context tao-bai-tap           # nhờ soạn bài mới, rồi gõ thêm chủ đề khi dán
npm run context tong-ket-tuan         # cuối tuần
npm run context cham-bai src/app.js   # review một file bất kỳ
```

Danh sách prompt: thư mục `prompts/`. Mỗi file là văn bản thường, sửa được theo ý.

## Theo dõi

- `PROGRESS.md`: cập nhật mỗi Chủ nhật.
- `REVIEW.md`: câu hỏi ôn cách quãng, mỗi dòng `- [ngày ôn tiếp] câu hỏi`.
