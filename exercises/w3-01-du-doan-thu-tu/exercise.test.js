import { test } from 'node:test';
import assert from 'node:assert/strict';
import { predictions } from './exercise.js';

// Các đoạn code giống hệt README, chỉ thay console.log bằng log() để thu kết quả thật.
const snippets = {
  snippetA(log) {
    log('A1');
    setTimeout(() => log('A2'), 0);
    log('A3');
  },

  snippetB(log) {
    log('B1');
    setTimeout(() => log('B2'), 0);
    Promise.resolve().then(() => log('B3'));
    log('B4');
  },

  snippetC(log) {
    async function loadCart() {
      log('C1');
      await null;
      log('C2');
    }

    log('C3');
    loadCart();
    log('C4');
  },

  snippetD(log) {
    setTimeout(() => log('D1'), 0);
    queueMicrotask(() => log('D2'));
    Promise.resolve().then(() => {
      log('D3');
      setTimeout(() => log('D4'), 0);
    });
    log('D5');
  },

  snippetE(log) {
    function saveOrder() {
      return new Promise((resolve) => {
        log('E1');
        setTimeout(() => {
          log('E2');
          resolve('ok');
        }, 10);
      });
    }

    saveOrder().then((result) => log('E3 ' + result));
    log('E4');
  },
};

async function runSnippet(snippet) {
  const logs = [];
  snippet((message) => logs.push(message));
  // Chờ mọi timer và Promise trong đoạn code chạy xong.
  await new Promise((resolve) => setTimeout(resolve, 100));
  return logs;
}

for (const [name, snippet] of Object.entries(snippets)) {
  test(`${name}: dự đoán đúng thứ tự log`, { timeout: 5000 }, async () => {
    const predicted = predictions[name];
    assert.ok(
      Array.isArray(predicted) && predicted.length > 0,
      `Chưa điền dự đoán cho ${name} trong exercise.js`,
    );
    const actual = await runSnippet(snippet);
    assert.deepEqual(
      predicted,
      actual,
      `Dự đoán ${name} chưa đúng. Xem lại phần "Giải thích" trong README rồi tự giải thích vì sao.`,
    );
  });
}
