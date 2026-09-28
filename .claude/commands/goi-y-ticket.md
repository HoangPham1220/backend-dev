---
description: Xin gợi ý khi kẹt ở ticket Voltix, không lấy đáp án (vd /goi-y-ticket VX-09)
argument-hint: <mã ticket>
---
Ticket: $ARGUMENTS trong repo /var/www/html/personal-project/voltix-store.

Đọc đề ticket /var/www/html/personal-project/voltix-store/tickets/$ARGUMENTS-*.md, code hiện tại ở các file liên quan (`grep -rn "$ARGUMENTS" /var/www/html/personal-project/voltix-store/src`), phần đã sửa (`git -C /var/www/html/personal-project/voltix-store diff`), tự chạy `npm --prefix /var/www/html/personal-project/voltix-store run ticket <số>`. Sau đó làm theo /var/www/html/personal-project/backend-dev/prompts/goi-y.md. Không sửa file của người học.
