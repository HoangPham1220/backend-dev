import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answers } from './exercise.js';

// Mỗi test so dự đoán của bạn với giá trị thật của biểu thức.
// assert.equal ở chế độ strict so bằng ===, nên "32" và 32 là khác nhau.

test('"3" + 2', () => {
  assert.equal(answers.noiChuoiVaSo, '3' + 2, 'Một vế là chuỗi thì + thành nối chuỗi');
});

test('"3" * 2', () => {
  assert.equal(answers.nhanChuoiVaSo, '3' * 2, 'Phép * luôn đổi hai vế sang số');
});

test('"10" - "4"', () => {
  assert.equal(answers.truHaiChuoi, '10' - '4', 'Phép - luôn đổi hai vế sang số, kể cả khi cả hai là chuỗi');
});

test('typeof null', () => {
  assert.equal(answers.typeofNull, typeof null, 'Đây là một lỗi lịch sử của JS, giữ lại để không phá code cũ');
});

test('typeof NaN', () => {
  assert.equal(answers.typeofNaN, typeof NaN, 'NaN là giá trị đặc biệt thuộc kiểu số');
});

test('0 || "mặc định"', () => {
  assert.equal(answers.hoacVoiSo0, 0 || 'mặc định', '|| bỏ qua vế trái khi vế trái falsy, mà 0 là falsy');
});

test('0 ?? "mặc định"', () => {
  assert.equal(answers.nullishVoiSo0, 0 ?? 'mặc định', '?? chỉ bỏ qua vế trái khi nó là null hoặc undefined');
});

test('"" && "x"', () => {
  assert.equal(answers.vaVoiChuoiRong, '' && 'x', '&& trả về vế trái nếu vế trái falsy, không trả về true/false');
});

test('null == undefined', () => {
  assert.equal(answers.nullBangUndefinedLong, null == undefined, '== có luật riêng cho cặp null/undefined');
});

test('null === undefined', () => {
  assert.equal(answers.nullBangUndefinedChat, null === undefined, '=== so cả kiểu, null và undefined là hai kiểu khác nhau');
});

test('Boolean("0")', () => {
  assert.equal(answers.booleanChuoi0, Boolean('0'), 'Khác PHP: trong JS mọi chuỗi khác rỗng đều truthy');
});

test('Boolean([])', () => {
  assert.equal(answers.booleanMangRong, Boolean([]), 'Khác PHP: trong JS mọi object/array, kể cả rỗng, đều truthy');
});
