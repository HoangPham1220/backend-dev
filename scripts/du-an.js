// Chạy test nghiệm thu của dự án lớn (du-an-lon/).
//   npm run du-an m1       -> test mốc M1
//   npm run du-an m1 m2    -> nhiều mốc
//   npm run du-an          -> các mốc chính M1–M5
//   npm run du-an all      -> tất cả, kể cả mốc nâng cao M6–M8
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.js';

const TESTS_DIR = join(ROOT, 'du-an-lon', 'tests');
if (!existsSync(TESTS_DIR)) {
  console.error('Chưa có thư mục du-an-lon/tests.');
  process.exit(1);
}

const CORE_MILESTONES = ['m1', 'm2', 'm3', 'm4', 'm5'];
const args = process.argv.slice(2).map((arg) => arg.toLowerCase());
// Không tham số: chỉ chạy mốc chính, để mốc nâng cao chưa làm không làm nhiễu kết quả.
const milestones = args.length === 0 ? CORE_MILESTONES : args.includes('all') ? [] : args;
const files = readdirSync(TESTS_DIR)
  .filter((file) => /^m\d+-.*\.test\.js$/.test(file))
  .filter((file) => milestones.length === 0 || milestones.some((m) => file.startsWith(`${m}-`)))
  .sort()
  .map((file) => join(TESTS_DIR, file));

if (files.length === 0) {
  console.error(`Không có file test cho mốc: ${milestones.join(', ')}. Các mốc: xem du-an-lon/SPEC.md`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--disable-warning=ExperimentalWarning', '--test', '--test-reporter=spec', '--test-concurrency=1', ...files],
  { cwd: ROOT, stdio: 'inherit', env: process.env },
);
process.exit(result.status ?? 1);
