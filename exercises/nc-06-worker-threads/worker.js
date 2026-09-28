// Worker mẫu — ĐÃ VIẾT SẴN, không cần sửa.
// Giao thức: nhận một message `data`, trả lời đúng một message:
//   { ok: true, result }   khi thành công
//   { ok: false, error }   khi lỗi (error là chuỗi message)
// data = { input, rounds, fail?, crash? }
//   - băm SHA-256 chuỗi input lặp lại `rounds` lần (việc nặng CPU)
//   - fail: true  → trả { ok: false }
//   - crash: true → process của worker thoát với exit code 1, không trả lời gì
import { parentPort, threadId } from 'node:worker_threads';
import { createHash } from 'node:crypto';

parentPort.on('message', (data) => {
  if (data.crash) process.exit(1);
  if (data.fail) {
    parentPort.postMessage({ ok: false, error: `Không xử lý được ${data.input}` });
    return;
  }
  let hash = data.input;
  for (let i = 0; i < data.rounds; i += 1) hash = createHash('sha256').update(hash).digest('hex');
  parentPort.postMessage({ ok: true, result: { hash, threadId } });
});
