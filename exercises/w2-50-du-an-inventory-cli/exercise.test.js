import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./exercise.js', import.meta.url));

let dir;
let dataFile;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'w2-50-'));
  dataFile = join(dir, 'inventory.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Chạy CLI như người dùng gõ lệnh. env: false để bỏ hẳn biến INVENTORY_FILE.
function run(args, { file = dataFile } = {}) {
  const env = { ...process.env, INVENTORY_FILE: file };
  if (file === false) delete env.INVENTORY_FILE;
  const result = spawnSync(process.execPath, [CLI, ...args], { env, encoding: 'utf8', timeout: 10_000 });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runOk(args) {
  const result = run(args);
  assert.equal(result.status, 0, `lệnh "${args.join(' ')}" phải thành công. stderr: ${result.stderr}`);
  assert.equal(result.stderr, '', 'thành công thì stderr phải trống');
  assert.notEqual(result.stdout.trim(), '', 'thành công phải in kết quả JSON ra stdout');
  return JSON.parse(result.stdout);
}

function assertFails(args, messagePart) {
  const result = run(args);
  assert.equal(result.status, 1, `lệnh "${args.join(' ')}" phải thất bại với exit code 1`);
  assert.ok(
    result.stderr.includes(messagePart),
    `stderr phải chứa "${messagePart}", nhận được: ${JSON.stringify(result.stderr)}`,
  );
  return result;
}

function seed(items) {
  writeFileSync(dataFile, JSON.stringify(items));
}

function readData() {
  return JSON.parse(readFileSync(dataFile, 'utf8'));
}

test('thiếu biến môi trường INVENTORY_FILE', () => {
  const result = run(['list'], { file: false });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('INVENTORY_FILE'), 'message phải nêu tên biến môi trường bị thiếu');
});

test('thiếu command hoặc command không hợp lệ', () => {
  const missing = run([]);
  assert.equal(missing.status, 1, 'thiếu command phải thất bại');
  assert.notEqual(missing.stderr.trim(), '', 'thiếu command phải có message ở stderr');
  assertFails(['delete', '--sku', 'A1'], 'Lệnh không hợp lệ');
});

test('add: thêm sản phẩm mới, tạo file khi chưa tồn tại', () => {
  assert.equal(existsSync(dataFile), false);
  const item = runOk(['add', '--sku', 'TSHIRT', '--qty', '10', '--name', 'Áo thun']);
  assert.deepEqual(item, { sku: 'TSHIRT', name: 'Áo thun', qty: 10 });
  assert.deepEqual(readData(), [{ sku: 'TSHIRT', name: 'Áo thun', qty: 10 }]);
});

test('add: không có --name thì name là sku, chấp nhận cả dạng --key=value', () => {
  const item = runOk(['add', '--sku=CAP', '--qty=3']);
  assert.deepEqual(item, { sku: 'CAP', name: 'CAP', qty: 3 });
});

test('add: sku đã có thì cộng dồn qty, giữ hoặc cập nhật tên', () => {
  seed([{ sku: 'CAP', name: 'Mũ', qty: 2 }]);
  assert.deepEqual(runOk(['add', '--sku', 'CAP', '--qty', '5']), { sku: 'CAP', name: 'Mũ', qty: 7 });
  assert.deepEqual(runOk(['add', '--sku', 'CAP', '--qty', '1', '--name', 'Mũ lưỡi trai']), {
    sku: 'CAP',
    name: 'Mũ lưỡi trai',
    qty: 8,
  });
  assert.deepEqual(readData(), [{ sku: 'CAP', name: 'Mũ lưỡi trai', qty: 8 }]);
});

test('add: file dữ liệu luôn sắp theo sku', () => {
  runOk(['add', '--sku', 'SOCK', '--qty', '1']);
  runOk(['add', '--sku', 'BAG', '--qty', '1']);
  runOk(['add', '--sku', 'CAP', '--qty', '1']);
  assert.deepEqual(readData().map((item) => item.sku), ['BAG', 'CAP', 'SOCK']);
});

test('add: qty không hợp lệ thì lỗi và không đổi file', () => {
  seed([{ sku: 'CAP', name: 'Mũ', qty: 2 }]);
  for (const qty of ['0', '-1', '1.5', 'abc']) {
    assertFails(['add', '--sku', 'CAP', '--qty', qty], 'qty');
  }
  assertFails(['add', '--sku', 'CAP'], 'qty');
  assert.deepEqual(readData(), [{ sku: 'CAP', name: 'Mũ', qty: 2 }]);
});

test('add: thiếu sku thì lỗi', () => {
  assertFails(['add', '--qty', '3'], 'sku');
  assert.equal(existsSync(dataFile), false, 'lỗi thì không được tạo file');
});

test('remove: trừ tồn kho, về 0 vẫn giữ item', () => {
  seed([{ sku: 'CAP', name: 'Mũ', qty: 5 }]);
  assert.deepEqual(runOk(['remove', '--sku', 'CAP', '--qty', '3']), { sku: 'CAP', name: 'Mũ', qty: 2 });
  assert.deepEqual(runOk(['remove', '--sku', 'CAP', '--qty', '2']), { sku: 'CAP', name: 'Mũ', qty: 0 });
  assert.deepEqual(readData(), [{ sku: 'CAP', name: 'Mũ', qty: 0 }]);
});

test('remove: không đủ hàng hoặc sku không tồn tại thì lỗi, không đổi file', () => {
  seed([{ sku: 'CAP', name: 'Mũ', qty: 2 }]);
  assertFails(['remove', '--sku', 'CAP', '--qty', '3'], 'Không đủ hàng');
  assertFails(['remove', '--sku', 'NOPE', '--qty', '1'], 'Không đủ hàng');
  assertFails(['remove', '--sku', 'CAP', '--qty', '0'], 'qty');
  assert.deepEqual(readData(), [{ sku: 'CAP', name: 'Mũ', qty: 2 }]);
});

test('list: in toàn bộ item sắp theo sku, kho rỗng là []', () => {
  assert.deepEqual(runOk(['list']), [], 'file chưa tồn tại thì kho rỗng');
  seed([
    { sku: 'SOCK', name: 'Tất', qty: 0 },
    { sku: 'BAG', name: 'Túi', qty: 12 },
  ]);
  assert.deepEqual(runOk(['list']).map((item) => item.sku), ['BAG', 'SOCK']);
});

test('list --low-stock: chỉ item có qty nhỏ hơn ngưỡng', () => {
  seed([
    { sku: 'BAG', name: 'Túi', qty: 12 },
    { sku: 'CAP', name: 'Mũ', qty: 5 },
    { sku: 'SOCK', name: 'Tất', qty: 0 },
  ]);
  assert.deepEqual(runOk(['list', '--low-stock=5']), [{ sku: 'SOCK', name: 'Tất', qty: 0 }], 'qty = 5 không tính (<)');
  assert.deepEqual(runOk(['list', '--low-stock', '6']).map((item) => item.sku), ['CAP', 'SOCK']);
});

test('export csv: ghi file đúng định dạng, escape tên có dấu phẩy và ngoặc kép', () => {
  seed([
    { sku: 'TSHIRT', name: 'Áo thun, cotton', qty: 10 },
    { sku: 'CAP', name: 'Mũ "snapback"', qty: 0 },
  ]);
  const out = join(dir, 'export.csv');
  assert.deepEqual(runOk(['export', '--format=csv', `--out=${out}`]), { exported: 2, out });
  assert.equal(
    readFileSync(out, 'utf8').trimEnd(),
    'sku,name,qty\nCAP,"Mũ ""snapback""",0\nTSHIRT,"Áo thun, cotton",10',
  );
});

test('export: format không hỗ trợ hoặc thiếu --out thì lỗi', () => {
  seed([{ sku: 'CAP', name: 'Mũ', qty: 1 }]);
  const out = join(dir, 'export.xlsx');
  assertFails(['export', '--format=xlsx', `--out=${out}`], 'format');
  assertFails(['export', `--out=${out}`], 'format');
  assertFails(['export', '--format=csv'], 'out');
  assert.equal(existsSync(out), false);
});
