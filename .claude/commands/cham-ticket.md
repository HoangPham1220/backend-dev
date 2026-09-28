---
description: Review code ticket Voltix (vd /cham-ticket VX-09)
argument-hint: <mã ticket, vd VX-09>
---
Ticket: $ARGUMENTS trong repo /var/www/html/personal-project/voltix-store.

1. Đọc đề ticket /var/www/html/personal-project/voltix-store/tickets/$ARGUMENTS-*.md và các tài liệu nó nhắc tới (docs/API.md, docs/DATABASE.md...).
2. Xem phần người học đã viết: `git -C /var/www/html/personal-project/voltix-store diff main...HEAD` và `git -C /var/www/html/personal-project/voltix-store diff` (chưa commit). Chưa có git hoặc chưa tách nhánh thì đọc thẳng các file liên quan (`grep -rn "$ARGUMENTS" /var/www/html/personal-project/voltix-store/src` để tìm chỗ).
3. Tự chạy `npm --prefix /var/www/html/personal-project/voltix-store run ticket <số>` để có kết quả test thật.
4. Làm theo /var/www/html/personal-project/backend-dev/prompts/cham-bai.md, và kiểm tra thêm checklist review trong /var/www/html/personal-project/voltix-store/docs/QUY_TRINH.md (đúng tầng, SQL tham số hoá, transaction, lớp lỗi).

Không sửa code của người học.
