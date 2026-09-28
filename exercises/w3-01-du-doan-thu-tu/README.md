# w3-01 · Dự đoán thứ tự log: event loop

**Mục tiêu:** đoán đúng thứ tự chạy của code đồng bộ, `setTimeout`, Promise và `async/await`.

## So với PHP

- PHP chạy tuần tự từ trên xuống, mỗi request một tiến trình riêng. Dòng sau chạy khi dòng trước xong hẳn.
- Node chạy **một tiến trình** phục vụ mọi request, nhờ **event loop**. Code đồng bộ chạy hết trước,
  các callback "để sau" (Promise, `setTimeout`) chạy khi call stack đã trống, theo thứ tự ưu tiên riêng.
- Vì vậy thứ tự viết code **không phải** thứ tự chạy. Đây là khác biệt lớn nhất khi chuyển từ PHP sang Node.

## Yêu cầu

**Không chạy thử trước khi đoán.** Đọc từng đoạn, ghi thứ tự log vào `predictions` trong `exercise.js`,
rồi mới chấm. Đoán sai cũng không sao: điều quan trọng là bạn đoán trước, rồi tìm hiểu vì sao sai.

Ví dụ: đoạn A in ra `A1` rồi `A3` rồi `A2` thì điền `snippetA: ['A1', 'A3', 'A2']`.

### Đoạn A

```js
console.log('A1');
setTimeout(() => console.log('A2'), 0);
console.log('A3');
```

### Đoạn B

```js
console.log('B1');
setTimeout(() => console.log('B2'), 0);
Promise.resolve().then(() => console.log('B3'));
console.log('B4');
```

### Đoạn C

```js
async function loadCart() {
  console.log('C1');
  await null;
  console.log('C2');
}

console.log('C3');
loadCart();
console.log('C4');
```

### Đoạn D

```js
setTimeout(() => console.log('D1'), 0);
queueMicrotask(() => console.log('D2'));
Promise.resolve().then(() => {
  console.log('D3');
  setTimeout(() => console.log('D4'), 0);
});
console.log('D5');
```

### Đoạn E

```js
function saveOrder() {
  return new Promise((resolve) => {
    console.log('E1');
    setTimeout(() => {
      console.log('E2');
      resolve('ok');
    }, 10);
  });
}

saveOrder().then((result) => console.log('E3 ' + result));
console.log('E4');
```

Lưu ý đoạn E: log cuối là chuỗi `'E3 ok'` (một phần tử).

## Chạy

```bash
npm run check w3-01
```

## Tự kiểm tra sau khi đạt

1. Giải thích bằng lời vì sao ở đoạn B, `B3` in trước `B2` dù `setTimeout` được viết trước.
2. Ở đoạn E, vì sao `E1` in ngay, trước cả `E4`?
3. Một hàm đồng bộ chạy vòng lặp nặng 5 giây trong một API Node. Chuyện gì xảy ra với các request khác
   trong 5 giây đó? So với PHP-FPM thì sao?

<details>
<summary>Giải thích (chỉ đọc SAU khi đã đoán và chấm)</summary>

- **Call stack:** nơi code đồng bộ đang chạy. Mọi dòng đồng bộ chạy hết trước.
- **Microtask queue:** callback của Promise (`.then`, phần sau `await`) và `queueMicrotask`.
  Chạy **ngay khi call stack trống**, chạy hết sạch hàng đợi này trước khi làm việc khác.
- **Macrotask (timer) queue:** callback của `setTimeout`, `setInterval`, I/O. Mỗi lượt event loop lấy ra
  một cái, sau mỗi cái lại xả hết microtask.
- Phần thân hàm `async` chạy đồng bộ **cho tới `await` đầu tiên**; phần sau `await` là microtask.
- Hàm truyền vào `new Promise(...)` (executor) chạy **đồng bộ, ngay lập tức**.

Thứ tự ưu tiên rút gọn: **đồng bộ → microtask → macrotask**.

</details>

<details>
<summary>Gợi ý mức 1 (chỉ mở khi kẹt quá 20 phút)</summary>

Với mỗi đoạn, chia dòng thành 3 nhóm: chạy ngay (đồng bộ), chạy "sớm" (Promise / await / queueMicrotask),
chạy "muộn" (setTimeout). Nhóm "sớm" luôn chạy trước nhóm "muộn".

</details>
