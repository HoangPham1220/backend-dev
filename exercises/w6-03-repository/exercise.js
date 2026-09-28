// Đề bài: README.md cùng thư mục. Chấm: npm run check w6-03
// db là một DatabaseSync của node:sqlite đã nạp dữ liệu mẫu (khoá ngoại đã bật).

export function createProductRepository(db) {
  return {
    create(data) {
      // TODO
    },
    findBySku(sku) {
      // TODO
    },
    list(options = {}) {
      // TODO
    },
    update(sku, changes = {}) {
      // TODO
    },
    delete(sku) {
      // TODO
    },
  };
}

export function createOrderRepository(db) {
  return {
    getOrderWithItems(orderId) {
      // TODO
    },
    listByCustomer(customerId) {
      // TODO
    },
    placeOrder({ customerId, items }) {
      // TODO
    },
  };
}
