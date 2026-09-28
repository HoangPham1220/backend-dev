// Gộp context học tập thành một prompt để dán vào bất kỳ AI nào.
//   npm run context                      -> chỉ context chung
//   npm run context bat-dau-buoi         -> kèm prompt mẫu prompts/bat-dau-buoi.md
//   npm run context cham-bai w1-03       -> kèm prompt + đề, code, test, kết quả test của bài w1-03
//   npm run context cham-bai src/app.js  -> kèm prompt + nội dung một file bất kỳ
//   npm run context goi-y VX-09          -> kèm đề ticket Voltix, git diff so với main, kết quả test ticket
// Kết quả ghi vào .context-bundle.md và copy vào clipboard nếu máy có wl-copy/xclip/xsel.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PROMPTS_DIR, resolveExercise, runTests, today } from './lib.js';

const read = (path) => readFileSync(path, 'utf8').trim();

// Ticket của project Voltix: đề ticket, phần code đã đổi so với nhánh main, kết quả test của ticket.
const VOLTIX_DIR = resolve(ROOT, '..', 'voltix-store');

function voltixTicketSection(ticketId) {
  const ticketsDir = join(VOLTIX_DIR, 'tickets');
  const ticketFile = existsSync(ticketsDir)
    ? readdirSync(ticketsDir).find((file) => file.startsWith(`${ticketId}-`))
    : null;
  if (!ticketFile) {
    console.error(`Không tìm thấy đề ticket ${ticketId} trong ${ticketsDir}.`);
    process.exit(1);
  }

  const run = (cmd, args) =>
    spawnSync(cmd, args, { cwd: VOLTIX_DIR, encoding: 'utf8', timeout: 180_000 });
  const git = (...args) => run('git', args);

  let diff = '(voltix-store chưa là git repo: AI hãy hỏi người học các file đã sửa)';
  if (git('rev-parse', '--is-inside-work-tree').status === 0) {
    const committed = git('diff', 'main...HEAD').stdout ?? '';
    const uncommitted = git('diff', 'HEAD').stdout ?? '';
    diff = `${committed}${uncommitted}`.trim() || '(chưa có thay đổi nào so với main)';
  }

  const number = String(Number(ticketId.slice(3)));
  const testRun = run('npm', ['run', '--silent', 'ticket', number]);
  const testOutput = `${testRun.stdout ?? ''}${testRun.stderr ?? ''}`
    .split('\n')
    .filter((line) => !/duration_ms|\(node:/.test(line))
    .join('\n')
    .trim();

  return [
    `# Ticket Voltix ${ticketId}`,
    `## Đề ticket\n\n${read(join(ticketsDir, ticketFile))}`,
    `## Code người học đã thay đổi (git diff so với main)\n\n\`\`\`diff\n${diff}\n\`\`\``,
    `## Kết quả npm run ticket ${number}\n\n\`\`\`\n${testOutput}\n\`\`\``,
  ].join('\n\n');
}

// File người học viết trong một bài: mọi file .js (kể cả trong lib/), trừ file test chấm bài
// và thư mục mutants/ (bài tuần 9). Riêng my.test.js là test do người học viết nên vẫn lấy.
function learnerFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.js') && !file.startsWith('mutants') && !file.endsWith('thu-sql.js'))
    .filter((file) => !file.endsWith('.test.js') || file.endsWith('my.test.js'))
    .sort((a, b) => (a === 'exercise.js' ? -1 : b === 'exercise.js' ? 1 : a.localeCompare(b)))
    .map((file) => join(dir, file));
}
const readIfExists = (path) => (existsSync(path) ? read(path) : null);

let promptName = null;
let exercise = null;
let ticket = null;
const extraFiles = [];

for (const arg of process.argv.slice(2)) {
  if (existsSync(join(PROMPTS_DIR, `${arg}.md`))) {
    promptName = arg;
  } else if (/^VX-\d+$/i.test(arg)) {
    ticket = arg.toUpperCase();
  } else if (resolveExercise(arg)) {
    exercise = resolveExercise(arg);
  } else if (existsSync(resolve(arg))) {
    extraFiles.push(resolve(arg));
  } else {
    console.error(`Không hiểu tham số "${arg}": không phải prompt, bài tập hay file.`);
    process.exit(1);
  }
}

const sections = [];

if (promptName) {
  sections.push(read(join(PROMPTS_DIR, `${promptName}.md`)));
}

sections.push(`# Context học tập (ngày ${today()})\n\n${read(join(ROOT, 'LEARNING_CONTEXT.md'))}`);

const progress = readIfExists(join(ROOT, 'PROGRESS.md'));
if (progress) sections.push(`# Tiến độ (PROGRESS.md)\n\n${progress}`);

// Chỉ lấy các câu ôn đã đến hạn, khỏi dán cả file.
const review = readIfExists(join(ROOT, 'REVIEW.md')) ?? '';
const dueItems = review
  .split('\n')
  .map((line) => line.match(/^- \[(\d{4}-\d{2}-\d{2})\]\s+(.+)$/))
  .filter((match) => match && match[1] <= today())
  .map((match) => `- ${match[2]}`);
if (dueItems.length > 0) {
  sections.push(`# Câu cần ôn hôm nay (từ REVIEW.md)\n\n${dueItems.join('\n')}`);
}

if (exercise) {
  // Bỏ các dòng thời gian chạy và stack nội bộ của Node để prompt gọn, giữ stack trỏ tới code bài tập.
  const output = runTests(exercise)
    .output.split('\n')
    .filter((line) => !/duration_ms|^\s*type: 'test'|\(node:/.test(line))
    .join('\n');
  sections.push(
    [
      `# Bài tập ${exercise.name}`,
      `## Đề bài\n\n${read(join(exercise.dir, 'README.md'))}`,
      ...learnerFiles(exercise.dir).map(
        (file) => `## Code của người học (${relative(exercise.dir, file)})\n\n\`\`\`js\n${read(file)}\n\`\`\``,
      ),
      `## File test (exercise.test.js)\n\n\`\`\`js\n${read(join(exercise.dir, 'exercise.test.js'))}\n\`\`\``,
      `## Kết quả chạy test (TAP)\n\n\`\`\`\n${output.trim()}\n\`\`\``,
    ].join('\n\n'),
  );
}

if (ticket) sections.push(voltixTicketSection(ticket));

for (const file of extraFiles) {
  sections.push(`# File ${relative(ROOT, file)}\n\n\`\`\`\n${read(file)}\n\`\`\``);
}

const bundle = `${sections.join('\n\n---\n\n')}\n`;
const outFile = join(ROOT, '.context-bundle.md');
writeFileSync(outFile, bundle);

const clipboards = [
  ['wl-copy', []],
  ['xclip', ['-selection', 'clipboard']],
  ['xsel', ['--clipboard', '--input']],
];
const copied = clipboards.some(
  ([cmd, cmdArgs]) => spawnSync(cmd, cmdArgs, { input: bundle }).status === 0,
);

console.log(`Đã ghi ${relative(ROOT, outFile)} (${bundle.length} ký tự).`);
console.log(
  copied
    ? 'Đã copy vào clipboard, dán vào AI là dùng được.'
    : 'Không tìm thấy công cụ clipboard (cài xclip hoặc wl-clipboard để tự copy). Mở file trên và copy thủ công.',
);
