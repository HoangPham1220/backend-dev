# nc-01 · LRU cache có TTL

**Mục tiêu:** tự cài một cache giới hạn kích thước, loại phần tử ít dùng gần đây nhất (LRU), có thời hạn sống (TTL),
mọi thao tác O(1), và gộp các lần tải trùng nhau khi cache trống.

## Vì sao quan trọng khi đi làm

Cache trong bộ nhớ là cách rẻ nhất để giảm tải database: giá sản phẩm, cấu hình cửa hàng, token của API bên thứ ba.
Nhưng cache không giới hạn sẽ ăn hết RAM, cache không hết hạn sẽ trả dữ liệu cũ. Magento có full page cache và
cache tag; ở Node bạn thường tự dựng lớp cache nhỏ hoặc dùng thư viện `lru-cache`.

Lỗi hay gặp trong phỏng vấn: dùng mảng để giữ thứ tự, mỗi lần `get` phải `indexOf` + `splice` → O(n).
`Map` trong JavaScript **giữ thứ tự chèn**: xóa rồi `set` lại một key là đưa nó xuống cuối, key đầu tiên
(`map.keys().next().value`) là key cũ nhất.

## Yêu cầu

### `new LRUCache({ max, ttlMs = Infinity, now = () => Date.now() })`

- `max` phải là số nguyên dương, sai → `RangeError`.
- `now` là hàm trả thời gian hiện tại (ms). Test truyền đồng hồ giả để không phải chờ thật.

| Method | Hành vi |
|---|---|
| `set(key, value)` | Lưu (hoặc ghi đè) và đánh dấu là **mới dùng nhất**, tính lại TTL. Vượt `max` → xóa key ít dùng gần đây nhất. Trả về `this` để gọi nối tiếp. |
| `get(key)` | Trả value và đánh dấu là mới dùng nhất. Không có hoặc đã hết hạn → `undefined`. |
| `has(key)` | `true` nếu có và chưa hết hạn. **Không** thay đổi thứ tự dùng. |
| `delete(key)` | Xóa, trả `true` nếu key có tồn tại. |
| `size` (getter) | Số phần tử **chưa hết hạn**. |
| `wrap(key, loader)` | Async. Có trong cache → trả luôn. Không có → gọi `await loader(key)`, lưu kết quả rồi trả. Nhiều lời gọi đồng thời cùng key chỉ gọi `loader` **một lần**. `loader` lỗi → mọi lời gọi đang chờ nhận lỗi, **không** lưu gì vào cache. |

Hết hạn: phần tử set ở thời điểm `t` hết hạn khi `now() - t >= ttlMs`.

```js
let t = 0;
const cache = new LRUCache({ max: 2, ttlMs: 1000, now: () => t });
cache.set('a', 1).set('b', 2);
cache.get('a');      // 1, giờ 'b' là ít dùng nhất
cache.set('c', 3);   // vượt max → xóa 'b'
cache.has('b');      // false
t = 1000;
cache.get('a');      // undefined (hết hạn)
```

## Chạy

```bash
npm run check nc-01
```

## Tự kiểm tra sau khi đạt

Vì sao `has()` không được làm thay đổi thứ tự dùng? Nếu `wrap` lưu cả lỗi vào cache thì chuyện gì xảy ra khi
database chỉ lỗi thoáng qua 1 giây?

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Lưu `{ value, savedAt }` trong một `Map`. "Đánh dấu mới dùng" = `delete` rồi `set` lại. Với `wrap`, giữ thêm một
`Map` các Promise đang chạy (in-flight): lời gọi thứ hai trả luôn Promise đó. Nhớ xóa Promise khỏi map khi nó
xong, dù thành công hay lỗi.

</details>

## Đọc thêm

- Thư viện `lru-cache` (npm): dùng rộng rãi trong hệ sinh thái Node.
- Khái niệm *cache stampede* / *thundering herd*: nhiều request cùng tải một key khi cache hết hạn. `wrap` ở đây là
  cách chống cơ bản nhất.
