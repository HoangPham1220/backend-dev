// Bộ chấm: chạy my.test.js của người học với bản cài đặt đúng và từng mutant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const MIN_TESTS = 6;

function runStudentTests(implPath) {
  const env = { ...process.env, DISCOUNT_IMPL: pathToFileURL(implPath).href };
  delete env.NODE_TEST_CONTEXT; // để tiến trình con chạy như một lần node --test độc lập
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', join(DIR, 'my.test.js')], {
    cwd: DIR,
    env,
    encoding: 'utf8',
    timeout: 20_000,
  });
  const count = (label) => Number(result.stdout.match(new RegExp(`^# ${label} (\\d+)`, 'm'))?.[1] ?? 0);
  return { passed: result.status === 0, tests: count('tests'), fail: count('fail'), output: result.stdout + result.stderr };
}

test(`my.test.js pass hết với bản cài đặt đúng và có ít nhất ${MIN_TESTS} test`, { timeout: 30_000 }, () => {
  const run = runStudentTests(join(DIR, 'lib', 'discount.js'));
  assert.ok(run.passed, `test của bạn phải pass với bản đúng (lib/discount.js). Output:\n${run.output.slice(-1500)}`);
  assert.ok(run.tests >= MIN_TESTS, `mới có ${run.tests} test, cần ít nhất ${MIN_TESTS}`);
});

const mutants = readdirSync(join(DIR, 'mutants')).filter((f) => f.endsWith('.js')).sort();

for (const file of mutants) {
  test(`giết được ${file.replace('.js', '')}`, { timeout: 30_000 }, () => {
    const run = runStudentTests(join(DIR, 'mutants', file));
    assert.ok(
      !run.passed,
      `${file} còn sống: toàn bộ test của bạn vẫn pass dù code có bug. ` +
        'Đọc lại đặc tả, tìm luật hoặc giá trị biên chưa được test.',
    );
  });
}
