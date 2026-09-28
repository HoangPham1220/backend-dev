# w2-09 · Tự viết Event Emitter cho đơn hàng

> Luyện thêm (tùy chọn): làm sau khi xong bài chính cùng chủ đề.

**Mục tiêu:** tự viết một event emitter đơn giản, qua đó hiểu mô hình "phát sự kiện, đăng ký xử lý"
mà Node dùng khắp nơi (server HTTP, stream, process...).

## So với PHP

Magento có **event/observer**: code gọi `$this->eventManager->dispatch('sales_order_place_after', [...])`,
các module khác khai báo observer trong `events.xml` để xử lý mà không cần sửa code gốc.

Node có ý tưởng tương tự trong module `node:events`:

```js
import { EventEmitter } from 'node:events';
const events = new EventEmitter();
events.on('order.paid', (order) => console.log('Đã thanh toán', order.id));
events.emit('order.paid', { id: 12 });
```

Bài này bạn **tự viết** một phiên bản nhỏ để hiểu bên trong nó làm gì. Làm xong hãy đọc tài liệu
`EventEmitter` của Node để so sánh.

## Yêu cầu

### 1. `class OrderEvents`

| Method | Việc |
|---|---|
| `on(event, handler)` | Đăng ký `handler` cho `event`. Trả về `this` để gọi nối tiếp được. |
| `off(event, handler)` | Huỷ đăng ký đúng `handler` đó (so sánh tham chiếu hàm). Trả về `this`. |
| `once(event, handler)` | Như `on` nhưng `handler` chỉ chạy **một lần** rồi tự huỷ. Trả về `this`. |
| `emit(event, ...args)` | Gọi mọi handler của `event` theo **thứ tự đăng ký**, truyền `...args`. Trả về `true` nếu có ít nhất một handler, ngược lại `false`. |
| `listenerCount(event)` | Số handler đang đăng ký cho `event`. |

Mỗi instance có danh sách handler riêng.

```js
const events = new OrderEvents();
const log = (order) => console.log(order.id);
events.on('order.paid', log).once('order.paid', () => console.log('lần đầu'));
events.emit('order.paid', { id: 1 }); // 1, 'lần đầu' -> true
events.emit('order.paid', { id: 2 }); // 2           -> true
events.off('order.paid', log);
events.emit('order.paid', { id: 3 }); // (không gì)   -> false
```

### 2. `wireOrderNotifications(events, notifier)`

Đăng ký 2 handler lên `events` (bất kỳ object nào có `on`/`off`, kể cả `EventEmitter` của Node):

- `'order.paid'` với `order` → gọi `notifier.send(order.customerEmail, 'Đơn #<id> đã thanh toán')`
- `'order.cancelled'` với `order` → gọi `notifier.send(order.customerEmail, 'Đơn #<id> đã bị huỷ')`

Trả về hàm `unsubscribe()`. Gọi nó thì huỷ **cả hai** handler.

## Chạy

```bash
npm run check w2-09
npm run watch w2-09
```

## Tự kiểm tra sau khi đạt

Vì sao `off` cần nhận **đúng** hàm đã đăng ký? Điều gì xảy ra với
`events.on('x', () => a()); events.off('x', () => a());`?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

- Lưu handler trong `this.handlers = {}` (hoặc `new Map()`), key là tên event, value là mảng hàm.
- `once`: bọc handler trong một hàm khác, hàm bọc này gọi `this.off(event, hàmBọc)` rồi gọi handler gốc.
- `emit`: duyệt trên **bản sao** của mảng handler (`[...list]`), vì handler `once` sẽ sửa mảng trong lúc duyệt.
- `wireOrderNotifications`: lưu 2 handler vào biến để `unsubscribe` gọi `off` với đúng tham chiếu đó.

</details>
