// Chạy thử một câu SQL trên dữ liệu mẫu (seed.sql) và in bảng kết quả.
//   node --disable-warning=ExperimentalWarning exercises/<bài>/thu-sql.js "SELECT * FROM products LIMIT 5"
// Mỗi lần chạy là một DB mới trong bộ nhớ, nên câu INSERT/UPDATE không ảnh hưởng lần chạy sau.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const sql = process.argv[2];
if (!sql) {
  console.error('Cách dùng: node thu-sql.js "SELECT ..."');
  process.exit(1);
}

const db = new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('./seed.sql', import.meta.url), 'utf8'));

try {
  const rows = db.prepare(sql).all();
  console.table(rows.map((row) => ({ ...row })));
  console.log(`${rows.length} dòng`);
} catch (error) {
  console.error(`Lỗi SQL: ${error.message}`);
  process.exit(1);
}
