# w1-10 · Phân trang danh sách sản phẩm

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** tính toán chỉ số chính xác (không lệch 1), kiểm tra tham số và ném lỗi đúng loại.

API nào trả danh sách cũng cần phân trang. Magento có `setPageSize()`/`setCurPage()` trên collection, còn ở đây bạn tự viết.

## So với PHP

- `Math.ceil(x)` giống `ceil($x)`. Nhưng `Math.ceil` trả về `number`, còn `ceil` PHP trả về `float`.
- `arr.slice(start, end)` giống `array_slice($arr, $start, $length)`, nhưng tham số thứ hai là **vị trí kết thúc (không lấy)**,
  không phải độ dài.
- Ném lỗi: `throw new RangeError('...')` tương tự `throw new \RangeException('...')`.

## Yêu cầu

### 1. `paginate(items, page, perPage)`

Trả về object:

```js
{ data, page, perPage, total, totalPages, hasNext }
```

- `data`: các phần tử của trang `page` (trang đánh số từ 1).
- `total`: tổng số phần tử. `totalPages`: số trang (0 nếu `items` rỗng).
- `hasNext`: còn trang sau hay không.
- `page` vượt quá số trang: `data` là `[]`, `hasNext` là `false`, các trường khác vẫn tính đúng.
- `page` hoặc `perPage` không phải số nguyên `>= 1` → `throw new RangeError(...)`, message chứa tên tham số sai
  (`'page'` hoặc `'perPage'`).
- Không sửa array `items`.

```js
const items = ['A', 'B', 'C', 'D', 'E'];
paginate(items, 2, 2);
// { data: ['C', 'D'], page: 2, perPage: 2, total: 5, totalPages: 3, hasNext: true }
paginate(items, 3, 2);
// { data: ['E'], page: 3, perPage: 2, total: 5, totalPages: 3, hasNext: false }
paginate(items, 0, 2); // RangeError: page ...
```

### 2. `describePage(result)`

Nhận object kết quả của `paginate`, trả chuỗi mô tả cho giao diện:

```js
describePage(paginate(items45, 2, 10)); // 'Hiển thị 11-20 / 45 sản phẩm'
describePage(paginate(items45, 5, 10)); // 'Hiển thị 41-45 / 45 sản phẩm'
describePage(paginate([], 1, 10));      // 'Không có sản phẩm nào'
describePage(paginate(items45, 9, 10)); // 'Không có sản phẩm nào'
```

## Chạy

```bash
npm run check w1-10
```

## Tự kiểm tra sau khi đạt

Viết công thức tính vị trí bắt đầu và kết thúc của `slice` theo `page` và `perPage`. Vì sao không cần kiểm tra riêng
trường hợp trang cuối thiếu phần tử?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Trang 1 bắt đầu từ index 0. Thử tính tay trang 2, 3 với `perPage = 2` rồi rút công thức.
`Number.isInteger` giúp kiểm tra số nguyên. `slice` vượt quá độ dài array không lỗi, chỉ trả array ngắn hơn hoặc rỗng.

</details>
