// Đề bài: README.md cùng thư mục. Chấm: npm run check nc-07
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export function createCsvTransform(columns) {
  // TODO
}

export function createLineCounter() {
  // TODO
}

export async function exportOrdersCsv(source, writable, { columns = ['id', 'customer', 'total', 'status'] } = {}) {
  // TODO
}
