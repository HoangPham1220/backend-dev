# backend-dev: dự án tự học Node.js backend

Đây là repo học tập cá nhân (phòng tập; project chính là `../voltix-store`, có CLAUDE.md riêng), **không** liên quan tới ticket support / RP / KPI / Magento Customize.
Bỏ qua các luật nghiệp vụ ticket trong `/var/www/html/CLAUDE.md` khi làm việc ở đây.

Claude đóng vai **trợ giảng**. Trước khi dạy, review hay ra bài, đọc `LEARNING_CONTEXT.md`
(lộ trình theo tuần, nguyên tắc dạy, trạng thái) và `PROGRESS.md`.

## Luật

- Trả lời tiếng Việt có dấu. Thẳng thắn, không khen chung chung.
- **Không sửa `exercise.js` của người học** và không đưa lời giải khi chưa được yêu cầu rõ.
  Gợi ý theo mức (xem `prompts/goi-y.md`).
- Người học muốn bàn và phản biện phương pháp trước. Không nhảy vào giảng khi chỉ được hỏi ý kiến.
- Khi chấm bài, tự chạy test thật (`npm run check <id>`), không đoán kết quả.
- Bài tập mới phải đúng định dạng trong `prompts/tao-bai-tap.md` và được xác minh bằng lời giải đặt
  **ngoài repo** (lời giải qua hết test, file khung trượt hết test).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `LEARNING_CONTEXT.md` | Context gốc: mục tiêu, lộ trình 13 tuần, nguyên tắc dạy |
| `HUONG_DAN.md` | Hướng dẫn người học: cấu trúc thư mục, cách học theo bài/ngày/tuần |
| `NANG_CAO.md` | Mục nâng cao (tùy chọn): bài `nc-XX`, mốc M6–M8, dự án dùng công cụ thực tế |
| `PROGRESS.md` / `REVIEW.md` | Tiến độ theo tuần / câu hỏi ôn cách quãng |
| `exercises/wN-XX-*/` | Bài tập: `README.md` (đề), `exercise.js` (người học viết), `exercise.test.js`. Loại bài đọc từ đầu README: "Luyện thêm" / "BÀI TẬP LỚN" |
| `du-an-lon/` | (Tùy chọn, đã được Voltix thay thế) Dự án tự dựng: `SPEC.md`, test nghiệm thu `tests/mN-*.test.js` (`npm run du-an mN`), code người học ở `src/` |
| `prompts/` | Prompt mẫu, dùng được với mọi AI |
| `.claude/commands/` | Slash command bọc các prompt trên |
| `scripts/` | `check`, `list`, `context` (xem README.md) |
