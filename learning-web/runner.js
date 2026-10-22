// Compatibility runner, not Node itself. Unsupported imports fail explicitly.
const cases = [];
let suite = '';
const report = data => postMessage(data);
globalThis.__lab = {
  test(name, fn) {
    if (typeof fn !== 'function') throw new Error('Test options are not supported in this browser runner.');
    cases.push({ name: suite + name, fn });
  },
  describe(name, fn) {
    const previous = suite;
    suite += name + ' / ';
    try { fn(); } finally { suite = previous; }
  },
};
function deep(a, b, seen = new Map()) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);
  if (a instanceof Date) return Object.is(a.getTime(), b.getTime());
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (a instanceof Map || a instanceof Set || ArrayBuffer.isView(a)) throw new Error('Deep comparison of Map/Set/typed arrays needs the Node runner.');
  const ka = Reflect.ownKeys(a), kb = Reflect.ownKeys(b);
  return ka.length === kb.length && ka.every(k => kb.includes(k) && deep(a[k], b[k], seen));
}
function fail(message = 'Assertion failed') { throw new Error(message); }
function check(value, message) { if (!value) fail(message); }
function errorMatches(error, expected) {
  if (!expected) return true;
  if (expected instanceof RegExp) return expected.test(String(error?.message ?? error));
  if (typeof expected === 'function') {
    if (expected === Error || expected.prototype instanceof Error) return error instanceof expected;
    return expected(error) === true;
  }
  return Object.keys(expected).every(k => expected[k] instanceof RegExp ? expected[k].test(error[k]) : deep(error[k], expected[k]));
}
const assert = {
  ok: check, fail,
  equal(a, b, m) { check(Object.is(a, b), m || `Expected ${String(b)}, received ${String(a)}`); },
  notEqual(a, b, m) { check(!Object.is(a, b), m || 'Expected different values/references'); },
  deepEqual(a, b, m) { check(deep(a, b), m || `Expected ${JSON.stringify(b)}, received ${JSON.stringify(a)}`); },
  notDeepEqual(a, b, m) { check(!deep(a, b), m || 'Expected different contents'); },
  match(a, b, m) { check(b.test(a), m || `Pattern ${b} did not match`); },
  doesNotMatch(a, b, m) { check(!b.test(a), m || `Pattern ${b} unexpectedly matched`); },
  throws(fn, expected, message) {
    if (typeof expected === 'string') { message = expected; expected = undefined; }
    let thrown = false;
    try { fn(); } catch (error) { thrown = true; check(errorMatches(error, expected), message || `Unexpected error: ${error}`); }
    check(thrown, message || 'Expected function to throw');
  },
  doesNotThrow(fn) { fn(); },
  async rejects(fn, expected, message) {
    let thrown = false;
    try { await (typeof fn === 'function' ? fn() : fn); } catch (error) { thrown = true; check(errorMatches(error, expected), message || `Unexpected error: ${error}`); }
    check(thrown, message || 'Expected promise rejection');
  },
};
assert.strictEqual = assert.equal;
assert.notStrictEqual = assert.notEqual;
globalThis.__lab.assert = assert;
const blob = text => URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
const shims = {
  'node:test': blob('export const {test,describe}=globalThis.__lab;'),
  'node:assert/strict': blob('export default globalThis.__lab.assert;'),
};
onmessage = async ({ data }) => {
  try {
    const urls = new Map();
    function normalize(from, spec) {
      const parts = from.split('/').slice(0, -1);
      for (const part of spec.split('/')) {
        if (part === '..') parts.pop();
        else if (part && part !== '.') parts.push(part);
      }
      return parts.join('/');
    }
    function compile(path, stack = []) {
      if (urls.has(path)) return urls.get(path);
      if (stack.includes(path)) throw new Error('Circular modules require the Node runner.');
      if (!(path in data.files)) throw new Error(`Missing module: ${path}`);
      const source = data.files[path].replace(/\b(from\s*|import\s*\()(['"])([^'"]+)\2/g, (whole, prefix, quote, spec) => {
        const url = shims[spec] || (spec.startsWith('.') ? compile(normalize(path, spec), [...stack, path]) : null);
        if (!url) throw new Error(`Unsupported browser import: ${spec}`);
        return prefix + quote + url + quote;
      });
      const url = blob(source + `\n//# sourceURL=${path}`);
      urls.set(path, url);
      return url;
    }
    await import(compile('exercise.test.js'));
    let passed = 0;
    for (const item of cases) {
      try { await item.fn(); passed++; report({ line: `✓ ${item.name}` }); }
      catch (error) { report({ line: `✗ ${item.name}\n  ${error.stack || error}` }); }
    }
    report({ done: true, passed, total: cases.length });
  } catch (error) { report({ done: true, error: error.stack || String(error) }); }
};
