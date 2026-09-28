# nc-14 · Saga: đặt hàng qua nhiều dịch vụ, lỗi thì hoàn tác từng bước

**Mục tiêu:** điều phối một quy trình gồm nhiều bước ở các hệ thống khác nhau, và dọn dẹp đúng khi một bước lỗi.

## Vì sao quan trọng khi đi làm

Đặt hàng cần: giữ hàng ở **kho**, trừ tiền ở **cổng thanh toán**, tạo vận đơn ở **đơn vị vận chuyển**. Ba hệ thống
riêng, không có transaction chung như trong một DB. Nếu vận chuyển lỗi sau khi đã trừ tiền, không thể `ROLLBACK`:
phải **chủ động hoàn tiền** rồi **nhả hàng**. Mỗi bước có một **hành động bù** (compensation):

| Bước | Hành động | Bù khi các bước sau lỗi |
|---|---|---|
| 1. reserveStock | `inventory.reserve(items)` → `reservationId` | `inventory.release(reservationId)` |
| 2. chargePayment | `payment.charge(customerId, total)` → `paymentId` | `payment.refund(paymentId)` |
| 3. createShipment | `shipping.create(orderId, address)` → `shipmentId` | (bước cuối, không cần) |

Hành động bù cũng có thể lỗi (cổng thanh toán sập đúng lúc hoàn tiền). Khi đó **không được giấu lỗi**: đánh dấu
cần người xử lý tay (`needs_manual_review`) và ghi log đủ để support biết phải hoàn tiền giao dịch nào.

## Yêu cầu

`placeOrderSaga({ order, inventory, payment, shipping, log })` (async). `order` dạng
`{ id, customerId, items, total, address }`. Các service là object có method async (có thể throw), `log` là hàm.

### Chạy các bước

Chạy lần lượt 3 bước theo bảng trên. Mỗi bước gọi `log({ step, action: 'run', status: 'ok' | 'error', error? })`
(`error` là message khi lỗi).

### Kết quả trả về

```js
{
  status: 'completed' | 'compensated' | 'needs_manual_review',
  steps: [{ name: 'reserveStock', status: 'done' }, ...],
  result: { reservationId, paymentId, shipmentId },   // chỉ khi completed
}
```

- Tất cả thành công → `completed`, mọi step `'done'`, có `result`.
- Một bước lỗi:
  - Bước đó có `status: 'failed'` và `error` (message). Các bước **sau** nó không chạy, không có trong `steps`.
  - Chạy hành động bù cho các bước **đã xong**, theo thứ tự **ngược lại** (xong sau thì bù trước).
    Mỗi lần bù gọi `log({ step, action: 'compensate', status: 'ok' | 'error', error? })`.
  - Bù thành công → step đó chuyển `status: 'compensated'`.
  - Bù lỗi → step đó chuyển `status: 'compensation_failed'` kèm `error`, và **vẫn tiếp tục bù các bước còn lại**.
  - Mọi lần bù đều ổn → `compensated`. Có ít nhất một lần bù lỗi → `needs_manual_review`.
- `placeOrderSaga` **không throw** vì lỗi của service; mọi thông tin nằm trong kết quả và log.

## Chạy

```bash
npm run check nc-14
```

## Tự kiểm tra sau khi đạt

1. Vì sao phải bù theo thứ tự ngược? Cho một ví dụ hỏng nếu nhả hàng trước khi hoàn tiền.
2. Hành động bù cần có tính chất gì để "thử bù lại" (do người xử lý hoặc job chạy lại) là an toàn?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Mô tả các bước thành một mảng `{ name, run, compensate }` rồi lặp. Giữ một mảng các bước **đã xong** kèm kết quả
của chúng (để `compensate` biết `reservationId`, `paymentId`). Khi lỗi, duyệt mảng đó từ cuối về đầu.

</details>

## Đọc thêm

- microservices.io: *Saga pattern* (orchestration vs choreography).
- Temporal.io, AWS Step Functions: công cụ chạy saga có lưu trạng thái bền vững.
- Shopify: đơn hàng có `financial_status` và `fulfillment_status` riêng, cũng vì các bước này tách rời nhau.
