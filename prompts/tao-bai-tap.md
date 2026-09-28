# Yêu cầu: soạn bài tập mới cho repo

Bạn là trợ giảng theo context bên dưới. Soạn bài tập theo chủ đề tôi nêu, **đúng định dạng repo** để tôi chấm bằng
`npm run check <id>`.

## Định dạng

Thư mục `exercises/wN-XX-slug-khong-dau/` gồm 3 file:

1. `README.md` (tiếng Việt), các mục:
   - `# wN-XX · Tên bài`
   - `**Mục tiêu:**` một câu, một mục tiêu chính.
   - `## So với PHP` (chỉ khi có khác biệt đáng nói).
   - `## Yêu cầu`: mỗi hàm một mục, nêu luật rõ ràng + ví dụ gọi hàm và kết quả.
   - `## Chạy`: `npm run check wN-XX` và `npm run watch wN-XX`.
   - `## Tự kiểm tra sau khi đạt`: một câu hỏi buộc phải giải thích bằng lời.
   - Gợi ý mức 1 trong `<details><summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary> ... </details>`.
2. `exercise.js`: khung ES Module, mỗi hàm là `export function ...` với thân `// TODO`. Không lộ lời giải.
3. `exercise.test.js`: `import { test } from 'node:test'`, `import assert from 'node:assert/strict'`,
   import từ `./exercise.js`. Tên test tiếng Việt mô tả trường hợp; message assertion giải thích vì sao
   trường hợp đó quan trọng. Không dùng thư viện ngoài, không gọi mạng ngoài, không phụ thuộc giờ hay locale.
   Test bất đồng bộ phải có `{ timeout: 5000 }`.

## Nội dung

- Dữ liệu theo domain ecommerce (product, sku, cart, order, stock, customer), giá VND số nguyên.
- 2–3 hàm mỗi bài, độ khó tăng dần trong bài. Có edge case (mảng rỗng, dữ liệu sai kiểu, giá trị biên).
- Bạn tự kiểm tra: lời giải của bạn (không đưa cho tôi) phải qua mọi test; file khung phải trượt mọi test.

Đưa nội dung đầy đủ 3 file, mỗi file trong một code block có ghi đường dẫn.
