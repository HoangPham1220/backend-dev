// Đề bài: README.md cùng thư mục. Chấm: npm run check w4-01
import http from 'node:http';

export const PRODUCTS = [
  { sku: 'TSHIRT-M', name: 'Áo thun M', price: 150000 },
  { sku: 'CAP', name: 'Mũ lưỡi trai', price: 80000 },
];

export function createServer() {
  // TODO: trả về http.createServer(...)
}
