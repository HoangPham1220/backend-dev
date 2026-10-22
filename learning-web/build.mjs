import { readdir, readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'learning-web/dist');
await mkdir(target, { recursive: true });
const lessons = [];
async function collect(dir, prefix = '') {
  const files = {};
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) Object.assign(files, await collect(join(dir, entry.name), prefix + entry.name + '/'));
    else if (/\.(js|json|md|csv|txt)$/.test(entry.name)) files[prefix + entry.name] = await readFile(join(dir, entry.name), 'utf8');
  }
  return files;
}
for (const name of await readdir(join(root, 'exercises'))) {
  if (!/^(w\d+|nc)-\d+/.test(name)) continue;
  const files = await collect(join(root, 'exercises', name));
  const readme = files['README.md'] || '';
  const code = Object.entries(files).filter(([path]) => path.endsWith('.js')).map(([, text]) => text).join('\n');
  const imports = [...code.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g)].map(m => m[2]);
  const supported = /^w[123]-/.test(name) && imports.every(s => s.startsWith('.') || ['node:test', 'node:assert/strict'].includes(s)) && !/\b(process|Buffer|require|__dirname)\b/.test(code);
  lessons.push({ id: name, title: readme.split('\n').find(l => l.startsWith('# '))?.slice(2).trim() || name, files, supported });
}
lessons.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
await writeFile(join(target, 'lessons.json'), JSON.stringify(lessons));
const teaching = {};
for (const path of ['AGENTS.md', 'LEARNING_CONTEXT.md', 'prompts/cham-bai.md']) {
  try { teaching[path] = await readFile(join(root, path), 'utf8'); }
  catch (error) {
    if (path !== 'AGENTS.md' || error.code !== 'ENOENT') throw error;
    teaching[path] = await readFile(join(root, 'learning-web/teaching-rules.md'), 'utf8');
  }
}
await writeFile(join(target, 'teaching.json'), JSON.stringify(teaching));
for (const file of ['index.html', 'style.css', 'app.js', 'runner.js']) await copyFile(join(root, 'learning-web', file), join(target, file));
await writeFile(join(target, '.nojekyll'), '');
console.log(`Built ${lessons.length} lessons into learning-web/dist (browser runner: ${lessons.filter(l => l.supported).length}).`);
