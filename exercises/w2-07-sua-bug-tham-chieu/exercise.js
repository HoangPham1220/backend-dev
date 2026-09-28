// Đề bài: README.md cùng thư mục. Chấm: npm run check w2-07
// Code dưới đây CHẠY ĐƯỢC NHƯNG SAI. Nhiệm vụ: tìm bug và sửa tối thiểu.

const DEFAULT_TAGS = [];

export function createOrder(id, tags = DEFAULT_TAGS) {
  tags.push('new');
  return { id, tags };
}

export function getTopProducts(products, n) {
  const sorted = products;
  sorted.sort((a, b) => b.price - a.price);
  return sorted.slice(0, n);
}

export function duplicateOrder(order, newId) {
  const draft = { ...order };
  draft.id = newId;
  draft.status = 'draft';
  return draft;
}

export function createSkuPrinters(skus) {
  const printers = [];
  for (var i = 0; i < skus.length; i++) {
    printers.push(() => skus[i]);
  }
  return printers;
}
