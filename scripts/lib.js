import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const EXERCISES_DIR = join(ROOT, 'exercises');
export const PROMPTS_DIR = join(ROOT, 'prompts');

// wN-XX: bài theo tuần. nc-XX: bài nâng cao, luôn xếp sau các tuần.
const ID_PATTERN = /^(w\d+|nc)-\d+/;

// Danh sách bài tập, sắp theo tuần rồi theo số thứ tự (w1-02 < w1-10 < w2-01).
export function listExercises() {
  if (!existsSync(EXERCISES_DIR)) return [];
  return readdirSync(EXERCISES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && ID_PATTERN.test(entry.name))
    .map((entry) => {
      const dir = join(EXERCISES_DIR, entry.name);
      return {
        id: entry.name.match(ID_PATTERN)[0],
        name: entry.name,
        dir,
        kind: entry.name.startsWith('nc-') ? 'advanced' : exerciseKind(dir),
      };
    })
    .sort(
      (a, b) =>
        (a.kind === 'advanced') - (b.kind === 'advanced') ||
        a.name.localeCompare(b.name, 'en', { numeric: true }),
    );
}

// Loại bài, đọc từ dòng đánh dấu trong README: 'extra' (luyện thêm), 'project' (bài tập lớn), 'core'.
// Bài nc-XX luôn là 'advanced'.
function exerciseKind(dir) {
  const readmePath = join(dir, 'README.md');
  const head = existsSync(readmePath) ? readFileSync(readmePath, 'utf8').slice(0, 600) : '';
  if (/BÀI TẬP LỚN/.test(head)) return 'project';
  if (/Luyện thêm/i.test(head)) return 'extra';
  return 'core';
}

// Tìm bài theo id ("w1-01") hoặc tiền tố tên thư mục. Trả về null nếu không có.
export function resolveExercise(query) {
  const all = listExercises();
  return (
    all.find((ex) => ex.id === query || ex.name === query) ??
    all.find((ex) => ex.name.startsWith(query)) ??
    null
  );
}

// Chạy test của một bài.
// quiet = true: không in ra màn hình, trả về số test đạt/trượt và output dạng TAP.
// quiet = false: in kết quả dễ đọc (reporter spec) thẳng ra terminal.
export function runTests(exercise, { quiet = true } = {}) {
  const testFile = join(exercise.dir, 'exercise.test.js');
  const result = spawnSync(
    process.execPath,
    ['--disable-warning=ExperimentalWarning', '--test', `--test-reporter=${quiet ? 'tap' : 'spec'}`, testFile],
    {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: quiet ? 'pipe' : 'inherit',
      timeout: 60_000,
    },
  );

  if (!quiet) return { passed: result.status === 0 };

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const count = (label) => Number(output.match(new RegExp(`^# ${label} (\\d+)`, 'm'))?.[1] ?? 0);
  return {
    passed: result.status === 0,
    pass: count('pass'),
    fail: count('fail'),
    output,
  };
}

export function today() {
  // en-CA cho định dạng YYYY-MM-DD theo giờ máy.
  return new Date().toLocaleDateString('en-CA');
}
