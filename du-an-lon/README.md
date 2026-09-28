# Dự án lớn: Order & Inventory API

Dự án portfolio chính của lộ trình (tuần 4–11). Đặc tả đầy đủ và hợp đồng với bộ test: [SPEC.md](SPEC.md).

| Mốc | Tuần | Nội dung | Test |
|---|---|---|---|
| M1 | 4 | CRUD sản phẩm, validation, phân trang, định dạng lỗi | `npm run du-an m1` |
| M2 | 5–6 | Tồn kho, đơn hàng, transaction, chống bán vượt | `npm run du-an m2` |
| M3 | 8 | Đăng ký, đăng nhập JWT, phân quyền | `npm run du-an m3` |
| M4 | 10 | Webhook kiểu Shopify: HMAC, idempotency | `npm run du-an m4` |
| M5 | 9–11 | Health check, request id, xử lý lỗi, giới hạn body | `npm run du-an m5` |
| M6 ⭐ | nâng cao | Cursor pagination, ETag/304, optimistic locking (If-Match → 412) | `npm run du-an m6` |
| M7 ⭐ | nâng cao | Idempotency-Key cho đặt hàng, chống tạo đơn trùng | `npm run du-an m7` |
| M8 ⭐ | nâng cao | Outbox sự kiện, webhook đi có retry, audit log | `npm run du-an m8` |

⭐ Mốc nâng cao là **tùy chọn**: chỉ làm sau khi M1–M5 đạt (SPEC mục "Mốc nâng cao").

Tuần 7 (TypeScript) không có mốc riêng: chuyển dự án sang TS, rồi chạy lại mọi mốc bằng `APP_ENTRY` (xem SPEC mục 1).

## Cách làm

1. Đọc mục của mốc trong SPEC.md, **tự thiết kế** trước (route, bảng DB, luồng xử lý). Viết nháp ra giấy nếu cần.
2. Chạy test của mốc, làm cho đạt. **Không sửa file trong `tests/`.**
3. Chạy lại test của **mọi mốc trước**: tính năng mới không được làm hỏng cái cũ.
4. Commit sau mỗi phần nhỏ chạy được, message rõ ràng.

## Tách thành repo riêng

Đây là thứ nhà tuyển dụng sẽ xem. Khi bắt đầu M1:

- Tạo repo git riêng (ví dụ `order-inventory-api`) và đẩy lên GitHub. Copy thư mục `tests/` sang, thêm script
  `"test:acceptance": "node --test tests/m*.test.js"` vào `package.json` của repo đó.
- Lịch sử commit đều đặn từ tuần 4 đến tuần 11 cho thấy quá trình làm việc thật.

## Checklist tuần 10–11 (không có test tự động)

- [ ] `README.md` của repo: dự án làm gì, kiến trúc (sơ đồ), cách chạy local, cách chạy test, biến môi trường,
      danh sách endpoint (hoặc link tài liệu OpenAPI).
- [ ] Phần "Quyết định kỹ thuật": vì sao chọn DB này, cách chống bán vượt, cách làm webhook idempotent,
      đánh đổi đã chấp nhận.
- [ ] `.env.example` liệt kê mọi biến, không commit `.env` thật.
- [ ] `Dockerfile` và `docker-compose.yml` (app + DB) để chạy bằng một lệnh.
- [ ] Migration cho schema DB, và seed dữ liệu mẫu.
- [ ] Unit test cho service (ngoài bộ test nghiệm thu này).
- [ ] Log có cấu trúc kèm request id, graceful shutdown.
- [ ] Deploy lên một host (Render, Railway, Fly.io hoặc VPS), có link chạy thật trong README.
- [ ] Tự trình bày dự án trong 5 phút: bài toán, kiến trúc, một khó khăn và cách giải quyết.
