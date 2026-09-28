# w1-05 · Object làm từ điển: nhóm và đếm

**Mục tiêu:** dùng object như bảng tra cứu (key → value) để nhóm và đếm dữ liệu.

## So với PHP

- Trong PHP, array kết hợp `$groups['paid'][] = $order;` làm được cả nhóm lẫn đếm. JS tách hai khái niệm: **array** (danh sách có thứ tự) và **object** (key → value).
- Truy cập key động bằng ngoặc vuông: `groups[order.status]`. Dấu chấm `groups.status` là key có tên cố định `"status"`.
- Đọc key chưa tồn tại **không báo lỗi**, chỉ trả về `undefined`. PHP thì báo warning `Undefined array key`.
- `groups[key].push(x)` khi `groups[key]` là `undefined` sẽ gây `TypeError`. Phải tạo array trước.
- `$arr[] = $x` trong PHP tương đương `arr.push(x)` trong JS.
- `Set` là tập hợp giá trị không trùng lặp, giống `array_unique` nhưng dùng ngay khi thêm phần tử.

## Dữ liệu mẫu

```js
const orders = [
  { id: 1, status: 'pending', email: 'an@example.com' },
  { id: 2, status: 'paid', email: 'binh@example.com' },
  { id: 3, status: 'pending', email: 'an@example.com' },
];
```

## Yêu cầu

### 1. `groupOrdersByStatus(orders)`

Trả về object nhóm đơn theo `status`. Chỉ có các key thực sự xuất hiện. Thứ tự đơn trong mỗi nhóm giữ như ban đầu.

```js
groupOrdersByStatus(orders);
// {
//   pending: [ {id: 1, ...}, {id: 3, ...} ],
//   paid:    [ {id: 2, ...} ],
// }
groupOrdersByStatus([]); // {}
```

### 2. `countByStatus(orders)`

```js
countByStatus(orders); // { pending: 2, paid: 1 }
```

### 3. `getCustomerEmails(orders)`

Array email không trùng lặp, giữ thứ tự lần xuất hiện đầu tiên.

```js
getCustomerEmails(orders); // ['an@example.com', 'binh@example.com']
```

## Chạy

```bash
npm run check w1-05
```

## Tự kiểm tra sau khi đạt

Vì sao `groups[order.status]` chạy đúng còn `groups.order.status` thì không? Mỗi cách JS hiểu là gì?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Mẫu quen thuộc: bắt đầu với `const groups = {};`, trong vòng lặp kiểm tra `if (!groups[key]) groups[key] = [];` rồi mới `push`.
Đếm: `counts[key] = (counts[key] ?? 0) + 1;`.
Email không trùng: `[...new Set(emails)]` đổi Set thành array.

</details>
