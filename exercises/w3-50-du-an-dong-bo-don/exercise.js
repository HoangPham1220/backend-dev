// Đề bài: README.md cùng thư mục. Chấm: npm run check w3-50
// Bước 5: hàm điều phối, dùng các module trong lib/.
import { getJson } from './lib/http.js';
import { fetchAllOrderIds } from './lib/paginate.js';
import { mapWithLimit } from './lib/pool.js';
import { writeJsonLines } from './lib/writer.js';

export async function syncOrders({ baseUrl, outFile, concurrency = 3, maxRetries = 3 }) {
  // TODO
}
