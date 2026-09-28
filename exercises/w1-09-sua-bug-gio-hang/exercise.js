// Đề bài: README.md cùng thư mục. Chấm: npm run check w1-09
// File này ĐÃ CÓ CODE nhưng có bug. Tìm và sửa tối thiểu, không viết lại cả hàm.

export function cartSubtotal(items) {
  let total = '';
  for (let i = 0; i <= items.length; i++) {
    const item = items[i];
    total += item.price * item.quantity;
  }
  return total;
}

export function hasSku(items, sku) {
  for (const item of items) {
    if (item.sku == sku) {
      return true;
    }
  }
  return false;
}

export function addItem(items, newItem) {
  const existing = items.find((item) => item.sku === newItem.sku);
  if (existing) {
    existing.quantity += newItem.quantity;
  } else {
    items.push(newItem);
  }
  return items;
}
