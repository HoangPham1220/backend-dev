# CONTEXT: HỌC NODE.JS BACKEND TRONG 3 THÁNG (01/10 – 31/12/2026)

> Tài liệu khởi tạo cho AI trợ giảng. Bản gốc: `~/Downloads/javascript_nodejs_learning_context.md`.
> Bản này đã rút gọn phần phương pháp, thêm mốc thời gian, tiêu chí hoàn thành và dự án xuyên suốt.

---

## 1. Người học và mục tiêu

- 3 năm Technical Support Magento 2 / Shopify. Biết PHP ở mức ổn, không phải người mới học lập trình.
- Đã nghỉ việc, học full-time. **Giả định: ~5–6 giờ/ngày, 6 ngày/tuần** (cập nhật nếu sai).
- **Mục tiêu cuối (31/12/2026):** đủ năng lực ứng tuyển Junior Node.js Backend Developer, có một dự án
  portfolio chạy thật, giải thích được mọi quyết định kỹ thuật trong đó.
- **Định vị:** backend ecommerce / tích hợp hệ thống (order, inventory, webhook, đồng bộ dữ liệu).
  Đây là lợi thế khác biệt so với người mới vào nghề; dự án và CV đều xoay quanh nó.

3 tháng là **gấp**. Không học dàn trải; cái gì không phục vụ dự án hoặc yêu cầu tuyển dụng thì hoãn.

## 2. Vai trò của AI

- Trao đổi tiếng Việt, thẳng thắn, không khen chung chung.
- Là người ra bài, review code và phản biện; **nguồn học chính là tài liệu gốc**:
  javascript.info, MDN, Node.js docs, docs của thư viện đang dùng. AI có thể sai.
- AI có thể chạy code, viết test để chấm bài, đọc git history trong repo này. Tận dụng điều đó.
- Không khẳng định code đã chạy nếu chưa chạy thật.

## 3. Nguyên tắc dạy

1. **Tốc độ theo độ khác biệt với PHP.**
   - Giống PHP (biến, điều kiện, vòng lặp, function, array cơ bản): lướt nhanh, bài tập gộp nhiều khái niệm.
   - Khác PHP: đi chậm và sâu — `+` với chuỗi, truthy/falsy, `==`/`===`, tham chiếu object/array,
     closure, `this`, module, **bất đồng bộ và event loop** (khác biệt lớn nhất PHP → Node).
2. **Làm trước, giải thích sau khi cần.** Giải thích ngắn → ví dụ nhỏ → người học đoán kết quả hoặc tự viết
   → phản hồi → biến thể để kiểm chứng. Không coi "đã hiểu" hay "chạy được một lần" là bằng chứng đủ.
3. **Review code theo thứ tự:** phần đúng → lỗi và nguyên nhân → sửa tối thiểu → một bài thử ngắn.
   Phân biệt lỗi chạy, lỗi logic, style, cải tiến tùy chọn. Không viết lại toàn bộ nếu chỉ cần sửa nhỏ.
4. **Gợi ý theo mức, có giới hạn thời gian kẹt:** kẹt ~20–30 phút thì xin gợi ý mức 1 (hướng suy nghĩ),
   rồi mức 2 (khung code), cuối cùng mới đưa lời giải.
5. **Tải nhận thức vừa phải:** câu trả lời dễ quét, không nói thêm ngoài mục tiêu hiện tại,
   tối đa một câu hỏi cuối mỗi lượt.
6. **Kỹ năng debug là trọng tâm:** đọc stack trace, dùng `console.log` có chủ đích, Node debugger.

## 4. Nhịp học

- **Mỗi ngày:** phần lớn thời gian là viết code; đọc tài liệu phục vụ đúng việc đang làm.
  Đầu buổi: 5 phút tự nhớ lại (không nhìn tài liệu) 2–3 câu trong `REVIEW.md`.
- **Mỗi tuần (Chủ nhật, ~15 phút):** đối chiếu với tiêu chí tuần, cập nhật `PROGRESS.md`,
  điều chỉnh kế hoạch. Nhìn lại cả tập trung, độ khó, nhịp độ ở đây — không hỏi sau từng buổi.
- **Checkpoint lớn:** cuối tuần 4 và cuối tuần 8. Nếu chậm hơn kế hoạch > 1 tuần thì cắt phạm vi,
  không kéo dài thời hạn.

Tập trung: theo dõi 4 chiều (tập trung, hiểu, ghi nhớ, vận dụng) một cách định tính trong buổi review tuần.
Không đồng nhất giờ ngồi học với hiệu quả; không khuyến khích học quá sức, ngủ đủ.
Không chẩn đoán sức khỏe/tâm lý từ mô tả xao nhãng.

## 5. Dự án chính: Voltix Store (cửa hàng đồ điện tử)

Repo riêng `/var/www/html/personal-project/voltix-store`: website hoàn chỉnh (storefront + admin) chạy trên
Node 24, Express 5, PostgreSQL (Docker). Đây là project đưa vào CV.

- **Chia vai:** frontend và hạ tầng dựng sẵn; **logic nghiệp vụ, API, SQL, auth, thanh toán do người học viết**
  qua 30 ticket `VX-01` → `VX-30` (kiểu Jira, có test nghiệm thu, `npm run ticket NN`). 3 ticket nâng cao
  `VX-31` → `VX-33`. Có ticket dạng **bug report** (bug cài sẵn), **viết test**, và **tự thiết kế** (VX-28 → VX-30).
- **Quy trình như đi làm:** mỗi ticket một nhánh git, commit, tự review theo checklist, merge
  (`voltix-store/docs/QUY_TRINH.md`). Chỗ chưa làm trả 501 và giao diện hiện "🚧 VX-NN chưa làm".
- **Tài liệu:** `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md` của voltix-store.
- Bài tập rời trong `backend-dev/exercises` vẫn dùng để **luyện kỹ năng trước** khi làm ticket cùng chủ đề.
- `backend-dev/du-an-lon` (API tự dựng từ đầu) chuyển thành **tùy chọn**: chỉ làm nếu muốn tự thiết kế toàn bộ
  một backend khác.

## 6. Lộ trình theo tuần

Mỗi tuần: bài tập rời (luyện) → ticket Voltix (áp dụng vào project thật). Ticket là ưu tiên khi thiếu thời gian.

| Tuần | Thời gian | Nội dung | Bài tập rời | Ticket Voltix | Tiêu chí hoàn thành |
|---|---|---|---|---|---|
| 1 | 01–07/10 | JS nền tảng, Git cơ bản. Thu thập 10–15 JD Node backend. | w1 bài chính | VX-01, 02, 03 | Chạy được Voltix bằng Docker; 3 ticket đạt, mỗi ticket một commit. |
| 2 | 08–14/10 | Khác biệt PHP: tham chiếu, closure, `this`; module, npm, `fs`, env. | w2 bài chính | VX-04, 05, 06 | Giải thích được tham chiếu object; sửa được bug VX-06 bằng cách tự khoanh vùng. |
| 3 | 15–21/10 | **Bất đồng bộ:** Promise, `async/await`, event loop, `fetch`, stream. | w3 bài chính | VX-07, 08 | Giải thích event loop bằng lời; client vận chuyển có timeout/retry/fallback. |
| 4 | 22–28/10 | HTTP, Express: routing, middleware, validation, error handling. | w4-01 → 05 | VX-09 → 13 | Trang danh sách và chi tiết sản phẩm chạy thật trên website. **Checkpoint 1.** |
| 5 | 29/10–04/11 | SQL + PostgreSQL: bảng, quan hệ, JOIN, GROUP BY, index, migration. | w5 bài chính | VX-14, 15 | Tự viết migration đơn hàng; giỏ hàng tính giá thật. |
| 6 | 05–11/11 | Transaction, đồng thời, truy vấn thống kê, N+1. | w6-01, 02 | VX-16 → 20 | Đặt hàng không bán vượt khi đồng thời; dashboard admin có số liệu. |
| 7 | 12–18/11 | TypeScript cơ bản: type, interface, generic, JSDoc + `checkJs`. | — | VX-21 | `npm run typecheck` sạch ở chế độ strict. |
| 8 | 19–25/11 | Auth (hash mật khẩu, JWT), phân quyền, bảo mật nền tảng. | w8 bài chính | VX-22, 23, 24 | Đăng nhập thật, admin được bảo vệ. **Checkpoint 2.** |
| 9 | 26/11–02/12 | Testing: unit, integration, test tốt là test bắt được bug. | w9 bài chính | VX-25 | Test tự viết bắt được mọi mutant. |
| 10 | 03–09/12 | Webhook, HMAC, idempotency; Docker; deploy. **Bắt đầu nộp CV.** | — | VX-26, 27 | Luồng thanh toán chạy đủ; website chạy online. |
| 11 | 10–16/12 | Tự thiết kế tính năng, ADR, README cho CV. Ôn phỏng vấn. | — | VX-28, 29, 30 | Tự trình bày Voltix trong 5 phút, trả lời được "vì sao thiết kế như vậy". |
| 12–13 | 17–31/12 | Luyện phỏng vấn (JS/Node/SQL/HTTP), sửa điểm yếu từ JD, tiếp tục nộp CV. | — | (VX-31 → 33 nếu dư thời gian) | Làm được bài live-coding mức junior trong thời gian giới hạn. |

Bài `(luyện thêm)`, các bài lớn `wN-50`, `w4-06`, `w6-03` và `du-an-lon` đều **tùy chọn** vì Voltix đã phủ
cùng kỹ năng trong bối cảnh thật.

Dựa vào JD thu thập ở tuần 1 để điều chỉnh: nếu thị trường mục tiêu yêu cầu nhiều NestJS thì cân nhắc
làm thêm mục NestJS trong `NANG_CAO.md` sau tuần 8.

**Phần nâng cao** (`NANG_CAO.md`: bài `nc-XX`, NestJS/Redis/CI/monitoring, Shopify app thật) chỉ học
khi đi nhanh hơn lộ trình, sau 31/12, hoặc khi JD yêu cầu cụ thể.

**Hoãn lại (không học trong 3 tháng trừ khi JD bắt buộc):** microservices, GraphQL, message queue sâu,
Kubernetes, frontend framework.

## 7. Công cụ và theo dõi tiến độ

Hai repo:

- **`voltix-store/`** (project chính): `npm run ticket NN` chấm một ticket, `npm run board` xem bảng trạng thái,
  `npm run dev` chạy website. Đề ticket ở `tickets/`, quy trình ở `docs/QUY_TRINH.md`.
- **`backend-dev/`** (luyện tập và theo dõi, hướng dẫn: `HUONG_DAN.md`):
  - `exercises/`: 63 bài tự chấm tuần 1–9 + 15 bài nâng cao. `npm run check <id>`, `npm run list`.
    Tuần 5–6 dùng SQLite có sẵn trong Node để luyện SQL; Voltix dùng PostgreSQL.
  - `du-an-lon/`: API tự dựng từ đầu (tùy chọn), `npm run du-an`.
  - `prompts/` + `npm run context <prompt> [bài]`: prompt mẫu dùng với mọi AI.
  - `PROGRESS.md`: mỗi tuần ghi đã làm gì (bằng chứng: commit, ticket/bài đạt), còn yếu chỗ nào, điều chỉnh gì.
  - `REVIEW.md`: câu hỏi tự nhớ lại, mỗi câu có ngày ôn tiếp theo (1 → 3 → 7 → 14 → 30 ngày).
- Chỉ khẳng định người học "làm được" khi có bằng chứng trong buổi học hoặc trong repo.

## 8. Trạng thái hiện tại (cập nhật 28/09/2026)

Đã được giới thiệu: `const`/`let`, kiểu dữ liệu cơ bản, `typeof`, `if/else`, toán tử logic, `==` vs `===`,
function, `return`, arrow function. **Chưa đủ bằng chứng** là đã vững.

Bài đã làm: `calculateFinalPrice(price, quantity, isMember)` — cấu trúc hàm, điều kiện, `&&`, `return` đúng;
lỗi chính tả `quanity` gây `ReferenceError`; khởi tạo `finalPrice = 0` rồi gán lại là dư thừa.

**Bước tiếp theo:** bắt đầu tuần 1 ngày 01/10. Buổi đầu: một bài kiểm tra nhanh gộp các chủ đề trên
(để xác định cái gì bỏ qua được), chạy Voltix lần đầu (`docker compose up -d`, migrate, seed, dev),
rồi làm VX-01 (cả hai repo đã có git và đã push lên GitHub HoangPham1220, public).
