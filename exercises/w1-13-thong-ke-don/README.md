# w1-13 · Thống kê đơn hàng

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** gom nhóm dữ liệu, sắp xếp theo nhiều tiêu chí, xử lý ngày giờ có múi giờ.

## So với PHP

- `arr.sort(fn)` **sửa luôn array gốc** (giống `usort`), và trả về chính array đó.
  Muốn giữ array gốc thì sort trên bản sao: `[...arr].sort(fn)`.
- Hàm so sánh trả số âm/0/dương, giống `usort`. Sắp giảm dần theo số: `(a, b) => b.spent - a.spent`.
- Không truyền hàm so sánh thì `sort()` so theo **chuỗi**: `[10, 9, 1].sort()` ra `[1, 10, 9]`.
- `new Date('2026-10-02T05:00:00+07:00').toISOString()` quy về UTC: `'2026-10-01T22:00:00.000Z'`.

## Dữ liệu

```js
const orders = [
  { id: 1, customer: 'An', total: 300000, status: 'paid', createdAt: '2026-10-01T09:00:00Z' },
  { id: 2, customer: 'Bình', total: 150000, status: 'cancelled', createdAt: '2026-10-01T10:00:00Z' },
  { id: 3, customer: 'An', total: 200000, status: 'shipped', createdAt: '2026-10-02T05:00:00+07:00' },
];
```

Đơn có `status === 'cancelled'` **không tính** trong cả hai hàm.

## Yêu cầu

### 1. `revenueByDay(orders)`

Trả về array `{ date, revenue, orderCount }`, sắp theo `date` tăng dần. `date` dạng `'YYYY-MM-DD'` **theo giờ UTC**.
Chỉ có những ngày có đơn.

```js
revenueByDay(orders);
// [{ date: '2026-10-01', revenue: 500000, orderCount: 2 }]
// đơn 3 lúc 05:00 giờ VN ngày 02 = 22:00 UTC ngày 01
```

### 2. `topCustomers(orders, n)`

Trả về `n` khách chi tiêu nhiều nhất: array `{ customer, spent, orderCount }`, sắp theo `spent` giảm dần.
Bằng `spent` thì sắp theo tên a → z. Ít hơn `n` khách thì trả hết. Không sửa array `orders`.

## Chạy

```bash
npm run check w1-13
```

## Tự kiểm tra sau khi đạt

Vì sao lấy `createdAt.slice(0, 10)` không đủ đúng? Cho một `createdAt` mà cách đó cho ra ngày sai.

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Gom nhóm bằng một object làm "bảng tra": key là ngày (hoặc tên khách), value là `{ revenue, orderCount }`.
Xong thì chuyển thành array bằng `Object.values(...)` hoặc `Object.entries(...)`, rồi mới sort.
So sánh tên: `a.customer.localeCompare(b.customer)`.

</details>
