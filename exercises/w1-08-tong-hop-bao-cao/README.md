# w1-08 · Bài tổng hợp tuần 1: báo cáo đơn hàng

**Mục tiêu:** tự kết hợp mọi thứ đã học trong tuần (hàm, điều kiện, array method, object, destructuring) để giải một bài gần với việc thật.

Đây là bài tổng hợp, được dùng **bất kỳ cách nào** đã học. Hãy tự thiết kế lời giải trước khi viết code:
chia thành những bước nhỏ nào, mỗi bước dùng công cụ gì.

## Dữ liệu

```js
const orders = [
  {
    id: 1,
    status: 'paid',
    items: [
      { sku: 'TSHIRT-01', price: 150000, quantity: 2 },
      { sku: 'CAP-02', price: 90000, quantity: 1 },
    ],
  },
  { id: 2, status: 'cancelled', items: [{ sku: 'BAG-03', price: 200000, quantity: 5 }] },
  { id: 3, status: 'shipped', items: [{ sku: 'CAP-02', price: 90000, quantity: 3 }] },
  { id: 4, status: 'pending', items: [{ sku: 'TSHIRT-01', price: 150000, quantity: 1 }] },
];
```

## Yêu cầu

Viết `buildOrderReport(orders)` trả về object:

| Key | Ý nghĩa |
|---|---|
| `orderCount` | Số đơn được tính |
| `revenue` | Tổng `price * quantity` của mọi item trong các đơn được tính |
| `topSku` | SKU có **tổng quantity** lớn nhất trong các đơn được tính. Hòa thì lấy SKU xuất hiện trước. Không có đơn nào thì `null` |
| `averageOrderValue` | `revenue / orderCount`, làm tròn bằng `Math.round`. Không có đơn nào thì `0` |

**Chỉ tính các đơn có `status` là `'paid'` hoặc `'shipped'`.** Đơn `pending` và `cancelled` bị bỏ qua hoàn toàn.

```js
buildOrderReport(orders);
// {
//   orderCount: 2,
//   revenue: 660000,            // đơn 1: 300000 + 90000; đơn 3: 270000
//   topSku: 'CAP-02',           // CAP-02: 1 + 3 = 4; TSHIRT-01: 2 (đơn 4 là pending, không tính)
//   averageOrderValue: 330000,
// }
```

## Chạy

```bash
npm run check w1-08
```

## Tự kiểm tra sau khi đạt

Nếu có 1 triệu đơn hàng, lời giải của bạn duyệt qua dữ liệu bao nhiêu lượt? Có cách nào gom lại chỉ một lượt không, và có đáng làm không?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Chia làm 3 bước: (1) `filter` lấy đơn hợp lệ; (2) tính `revenue` bằng `reduce`;
(3) đếm quantity theo SKU vào một object (giống `countByStatus` ở bài w1-05), rồi duyệt object đó để tìm SKU lớn nhất.
Object trong JS giữ thứ tự thêm key đối với key dạng chuỗi, nên "SKU xuất hiện trước" chính là key được thêm trước.

</details>
