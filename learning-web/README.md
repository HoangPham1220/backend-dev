# Backend Lab — học trên điện thoại

Trang tĩnh dùng trên GitHub Pages, không cần cài package. Phần web độc lập với code bài tập và script chấm Node hiện có.

## Mở trên máy

Tại gốc repo, chạy lần lượt:

```powershell
node learning-web/build.mjs
node learning-web/serve.mjs
```

Mở http://127.0.0.1:4173. Dừng server bằng Ctrl+C. Build chụp README, dữ liệu và code hiện tại từ `exercises/`; không sửa chúng. Sau khi cập nhật bài gốc, build lại.

## Học trên web

- Chọn bài, chuyển Đề bài / Viết code / Kết quả.
- **Gửi ngữ cảnh cho AI** mở khung xem nội dung của bài đang mở: đề, test chuẩn, code mới nhất trên thiết bị, kết quả đang hiển thị và tài liệu giảng dạy. Bấm **Tải file ngữ cảnh** để lấy Markdown đính kèm vào chat, hoặc **Sao chép nội dung** để dán. Không tự gửi lên AI; không bao gồm lịch sử chat/tiến độ các bài khác. Build dùng AGENTS.md hiện tại; nếu file không có trên nhánh deploy thì dùng bản quy tắc trong `learning-web/teaching-rules.md`.
- Chọn file bằng danh sách; file test gốc chỉ đọc.
- Sửa code được lưu trong localStorage của trình duyệt. Không tự ghi vào repo hoặc đồng bộ giữa thiết bị. Chế độ riêng tư/xóa dữ liệu trình duyệt có thể mất bài.
- Dùng **Xuất bài làm** để tạo JSON sao lưu, chuyển file đó sang điện thoại rồi **Nhập bài làm**. Nhập sẽ hỏi trước khi thay file trùng.
- **Khôi phục file** trở về bản chụp lúc build, không phải lời giải mẫu hoặc skeleton ban đầu.
- Có thể đọc và sửa tất cả bài. Bản đầu chỉ bật chạy cho nhóm JS tuần 1–3 không phụ thuộc Node/package ngoài. Bộ chạy tương thích một phần `node:test` và `node:assert/strict`, dùng nguyên nội dung test gốc, không phải Node thật. Import không hỗ trợ/vòng phụ thuộc sẽ báo lỗi. Luôn chạy test Node khi có máy trước khi kết luận hoàn thành chính thức.
- Chạy trong worker, dừng sau 10 giây. Không hỗ trợ server, fs, SQLite, process, Buffer, package npm. Không phải sandbox để chạy mã không tin cậy.
- Cần mạng khi tải trang/bài; chưa hỗ trợ offline. Bài làm local không tự chuyển vào source khi build.

## GitHub Pages

Workflow `.github/workflows/learning-pages.yml` chỉ chạy thủ công, không tự chạy khi push.

1. Đưa các file mới của tính năng web lên nhánh GitHub được chọn. Không dùng `git add .` nếu còn bài làm chưa muốn commit.
2. Repository → Settings → Pages → Source: **GitHub Actions**.
3. Actions → **Publish Backend Lab** → **Run workflow**, chọn nhánh có tính năng web.
4. Khi workflow thành công, mở URL trong job/deployment bằng điện thoại.

Workflow build bài học từ code đã commit trên nhánh được chọn. Site chứa cả đề, test và code bài tập tại thời điểm build; xem lại nội dung trước khi công khai. Không có mật khẩu hoặc cấu hình `.env` nào được build. Chưa có tự đồng bộ bài làm lên GitHub.

## Rollback

Tính năng chỉ thêm `learning-web/` và `.github/workflows/learning-pages.yml`; không sửa `package.json`, bài tập hoặc script chấm cũ.

- Trước khi commit: bỏ riêng các file mới của tính năng; không dùng `git reset --hard` hoặc `git clean` vì repo có bài làm chưa commit.
- Nên commit riêng tính năng web. Nếu đã commit: dùng `git revert <commit-tính-năng-web>` để đảo riêng commit đó.
- Nếu đã xuất bản: Settings → Pages → Unpublish site để ngừng phục vụ. Revert workflow không tự gỡ site đã deploy.
- Xuất bài làm trên từng thiết bị trước khi đổi địa chỉ site hoặc xóa dữ liệu trình duyệt. Rollback source không xóa localStorage.

Chưa push, commit hay xuất bản tự động khi tạo tính năng này.
