// Bảng tiến độ toàn bộ bài tập: npm run list
import { listExercises, runTests } from './lib.js';

const exercises = listExercises();
if (exercises.length === 0) {
  console.log('Chưa có bài tập nào trong thư mục exercises/.');
  process.exit(0);
}

let done = 0;
let currentWeek = null;

for (const exercise of exercises) {
  const week = exercise.id.split('-')[0];
  if (week !== currentWeek) {
    console.log(`\n${week === 'nc' ? 'NÂNG CAO' : week.toUpperCase()}`);
    currentWeek = week;
  }

  const { passed, pass, fail } = runTests(exercise);
  const total = pass + fail;
  let icon = '❌';
  if (passed) {
    icon = '✅';
    done += 1;
  } else if (pass === 0) {
    icon = '⬜';
  }
  const score = total > 0 ? `${pass}/${total}` : 'lỗi khi chạy';
  const tag = { core: '', extra: '  (luyện thêm)', project: '  ★ BÀI LỚN', advanced: '  (nâng cao)' }[exercise.kind];
  console.log(`  ${icon} ${exercise.name.padEnd(36)} ${score.padEnd(6)}${tag}`);
}

console.log(`\nĐạt ${done}/${exercises.length} bài.   ✅ đạt   ❌ đạt một phần   ⬜ chưa đạt test nào\n`);
