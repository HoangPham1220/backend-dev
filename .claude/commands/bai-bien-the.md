---
description: Tạo bài biến thể để kiểm chứng sau khi đạt (vd /bai-bien-the w1-04)
argument-hint: <id bài gốc>
---
Bài gốc:  (thư mục /var/www/html/personal-project/backend-dev/exercises/-*). Làm theo /var/www/html/personal-project/backend-dev/prompts/bai-bien-the.md và định dạng trong /var/www/html/personal-project/backend-dev/prompts/tao-bai-tap.md.

Tạo thẳng các file trong /var/www/html/personal-project/backend-dev/exercises/. Tự viết lời giải vào thư mục tạm ngoài repo để xác minh: lời giải qua hết test, file khung trượt hết test. Không để lời giải trong repo, không cho người học xem.

Giao việc soạn cho agent `soan-bai-tap` (chạy Sonnet): prompt ghi rõ id bài, chủ đề, các hàm và luật cần có. Nhiều bài độc lập thì giao song song, mỗi agent một nhóm bài. Khi agent xong, tự kiểm tra lại: chạy `npm run check <id>` (khung phải trượt hết) và đọc lướt README/test xem có đúng yêu cầu không.
