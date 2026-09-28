// Chấm một bài tập bằng test.
//   npm run check            -> tự tìm bài đầu tiên chưa đạt
//   npm run check w1-03      -> chấm bài w1-03
//   npm run watch w1-03      -> chấm lại mỗi khi lưu file
import { spawn } from 'node:child_process';
import { join, relative } from 'node:path';
import { ROOT, listExercises, resolveExercise, runTests } from './lib.js';

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const query = args.find((arg) => !arg.startsWith('--'));

let exercise;
if (query) {
  exercise = resolveExercise(query);
  if (!exercise) {
    console.error(`Không tìm thấy bài "${query}". Xem danh sách: npm run list`);
    process.exit(1);
  }
} else {
  // Bỏ qua bài luyện thêm và nâng cao khi tự chọn bài: chúng là tùy chọn.
  exercise = listExercises().find(
    (ex) => ex.kind !== 'extra' && ex.kind !== 'advanced' && !runTests(ex).passed,
  );
  if (!exercise) {
    console.log('Tất cả bài tập hiện có đều đã đạt.');
    process.exit(0);
  }
}

const readme = relative(ROOT, join(exercise.dir, 'README.md'));
console.log(`\n▶ ${exercise.name}   (đề bài: ${readme})\n`);

if (watch) {
  // Chạy lại test mỗi khi file trong thư mục bài thay đổi. Ctrl+C để thoát.
  spawn(
    process.execPath,
    ['--disable-warning=ExperimentalWarning', '--test', '--watch', '--test-reporter=spec', join(exercise.dir, 'exercise.test.js')],
    { cwd: ROOT, stdio: 'inherit' },
  );
} else {
  const { passed } = runTests(exercise, { quiet: false });
  if (passed) {
    console.log(`\n✅ Đạt. Trước khi sang bài mới: tự giải thích lại bằng lời vì sao code chạy đúng.`);
  } else {
    console.log(
      `\n❌ Chưa đạt. Đọc dòng "expected/actual" và stack trace ở trên trước.` +
        `\n   Kẹt quá 20–30 phút: npm run context goi-y ${exercise.id}`,
    );
  }
  process.exit(passed ? 0 : 1);
}
