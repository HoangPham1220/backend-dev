// Đề bài: README.md cùng thư mục. Chấm: npm run check w3-08
// Code dưới đây có bug. Sửa tối thiểu, ghi `// BUG: ...` giải thích trước mỗi chỗ sửa.

export async function saveAllOrders(orders, saveOrder) {
  let saved = 0;
  orders.forEach(async (order) => {
    await saveOrder(order);
    saved += 1;
  });
  return saved;
}

export async function getProductPrice(id, fetchProduct) {
  const product = fetchProduct(id);
  return product.price;
}

export async function getStockOrZero(sku, fetchStock) {
  try {
    return fetchStock(sku);
  } catch (error) {
    return 0;
  }
}

export async function fetchPrices(ids, fetchProduct) {
  try {
    const products = await Promise.all(ids.map((id) => fetchProduct(id)));
    return products.map((product) => product.price);
  } catch (error) {
    return [];
  }
}

export function getOrderTotal(id, fetchOrder) {
  return fetchOrder(id).then((order) => {
    order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });
}
