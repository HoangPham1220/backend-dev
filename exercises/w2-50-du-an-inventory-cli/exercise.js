// Đề bài: README.md cùng thư mục. Chấm: npm run check w2-50
// Điểm vào của CLI. Chỉ file này được dùng process.argv, process.env, console, process.exitCode.
import { parseArgs } from './lib/args.js';
import { loadInventory, saveInventory } from './lib/store.js';
import { runCommand } from './lib/commands.js';

// TODO:
// 1. Đọc INVENTORY_FILE từ process.env (thiếu thì báo lỗi).
// 2. parseArgs(process.argv.slice(2)).
// 3. Đọc dữ liệu, chạy lệnh, ghi file nếu cần, in kết quả JSON ra stdout.
// 4. Lỗi: in message ra stderr, process.exitCode = 1.
