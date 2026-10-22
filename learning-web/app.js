const $ = id => document.getElementById(id);
const prefix = 'backend-lab:v1:';
let lessons = [], current, filename, worker, timer;
let drafts = {};
try { drafts = JSON.parse(localStorage.getItem(prefix + 'drafts') || '{}'); } catch { /* Keep page usable when storage is unavailable. */ }
const escape = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function markdown(text) {
  let fenced = false;
  let table = false;
  const inline = text => escape(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return text.split('\n').map(line => {
    let close = '';
    if (table && !line.trim().startsWith('|')) { table = false; close = '</tbody></table></div>'; }
    if (!fenced && line.trim().startsWith('|')) {
      if (/^\s*\|[\s:|\-]+\|\s*$/.test(line)) return '';
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(cell => `<td>${inline(cell.trim())}</td>`).join('');
      const start = table ? '' : '<div class="table-scroll"><table><tbody>';
      table = true;
      return start + '<tr>' + cells + '</tr>';
    }
    if (line.startsWith('```')) { fenced = !fenced; return fenced ? '<pre><code>' : '</code></pre>'; }
    if (fenced) return escape(line) + '\n';
    const safe = inline(line);
    const heading = safe.match(/^(#{1,4}) (.*)/);
    if (heading) return `<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`;
    if (/^[-*] /.test(line)) return `<div>• ${safe.slice(2)}</div>`;
    if (line.startsWith('> ')) return `<blockquote>${safe.slice(2)}</blockquote>`;
    return close + (safe ? `<div>${safe}</div>` : '<br>');
  }).join('\n') + (fenced ? '</code></pre>' : '') + (table ? '</tbody></table></div>' : '');
}
function tab(name) {
  document.querySelectorAll('.panel').forEach(el => el.hidden = el.id !== name);
  document.querySelectorAll('[data-tab]').forEach(el => el.setAttribute('aria-selected', String(el.dataset.tab === name)));
}
document.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => tab(el.dataset.tab));
function save() {
  if (!current || !filename || $('editor').readOnly) return;
  drafts[current.id] ??= {};
  drafts[current.id][filename] = $('editor').value;
  try { localStorage.setItem(prefix + 'drafts', JSON.stringify(drafts)); $('save-status').textContent = 'Đã lưu trên thiết bị này · ' + new Date().toLocaleTimeString('vi'); }
  catch { $('save-status').textContent = 'Không lưu được trên thiết bị. Hãy xuất bài làm để tránh mất code.'; }
}
function loadFile() {
  filename = $('files').value;
  $('editor').readOnly = filename.endsWith('.test.js');
  $('editor').value = drafts[current.id]?.[filename] ?? current.files[filename];
  $('reset').disabled = $('editor').readOnly;
  $('save-status').textContent = $('editor').readOnly ? 'Test gốc · chỉ đọc' : 'Tự lưu khi bạn chỉnh sửa · không tự đồng bộ giữa thiết bị';
}
function stop() {
  worker?.terminate(); worker = null; clearTimeout(timer);
  if (current) $('run').disabled = !current.supported;
}
function choose(id) {
  stop();
  current = lessons.find(l => l.id === id) || lessons[0];
  if (!current) return;
  $('title').textContent = current.title;
  $('lesson-id').textContent = current.id.toUpperCase();
  $('support').textContent = current.supported ? 'Chạy JavaScript trên web' : 'Đọc / viết · chạy bằng Node';
  $('run').disabled = !current.supported;
  $('notice').textContent = current.supported ? 'Lưu tự động trên thiết bị. Xuất bài làm để sao lưu hoặc chuyển sang điện thoại.' : 'Bản đầu chưa chạy test bài này trên web. Bạn vẫn có thể đọc, sửa, lưu và xuất code để chạy bằng Node sau.';
  $('prose').innerHTML = markdown(current.files['README.md'] || 'Chưa có đề bài.');
  $('files').replaceChildren(...Object.keys(current.files).filter(f => f.endsWith('.js')).sort((a,b) => (a === 'exercise.js' ? -1 : b === 'exercise.js' ? 1 : a.localeCompare(b))).map(f => new Option(f, f)));
  loadFile(); tab('readme');
  $('output').textContent = 'Chưa chạy phiên bản code này.';
  try { localStorage.setItem(prefix + 'lesson', current.id); } catch {}
  history.replaceState(null, '', '#' + encodeURIComponent(current.id));
  renderList();
}
function renderList() {
  const query = $('search').value.toLocaleLowerCase('vi');
  const selectedWeek = $('week').value;
  const list = lessons.filter(l => (!selectedWeek || l.id.split('-')[0] === selectedWeek) && (l.title + l.id).toLocaleLowerCase('vi').includes(query));
  $('lessons').replaceChildren(...list.map(l => {
    const button = document.createElement('button');
    button.textContent = l.title;
    button.setAttribute('aria-current', String(current?.id === l.id));
    button.onclick = () => choose(l.id);
    return button;
  }));
  if (!list.length) $('lessons').textContent = 'Không tìm thấy bài phù hợp.';
}
$('search').oninput = renderList; $('week').onchange = renderList;
$('files').onchange = loadFile;
$('editor').oninput = () => { save(); $('output').textContent = 'Code đã thay đổi. Hãy chạy lại test.'; };
$('editor').onkeydown = e => {
  if (e.key === 'Tab' && !e.target.readOnly) { e.preventDefault(); const el = e.target; el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end'); save(); }
};
$('reset').onclick = () => {
  if (!confirm('Khôi phục file về bản chụp lúc build web? Code sửa trên thiết bị của file này sẽ bị thay thế.')) return;
  delete drafts[current.id]?.[filename];
  $('editor').value = current.files[filename]; save();
};
$('run').onclick = () => {
  save(); stop(); tab('results'); $('run').disabled = true;
  $('output').textContent = 'Đang chạy test trong worker…\n';
  try {
    worker = new Worker(new URL('./runner.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.line) $('output').textContent += '\n' + data.line;
      if (data.done) {
        $('output').textContent += data.error ? '\nLỗi: ' + data.error : `\n\n${data.passed}/${data.total} test đạt (bộ tương thích trình duyệt).`;
        stop();
      }
    };
    worker.onerror = e => { $('output').textContent += '\nKhông chạy được: ' + e.message; stop(); };
    const files = { ...current.files };
    for (const [path, value] of Object.entries(drafts[current.id] || {})) if (path in files && !path.endsWith('.test.js')) files[path] = value;
    worker.postMessage({ files });
    timer = setTimeout(() => { $('output').textContent += '\nDừng sau 10 giây. Kiểm tra vòng lặp hoặc tác vụ chưa kết thúc.'; stop(); }, 10000);
  } catch (error) { $('output').textContent += '\n' + error.message; stop(); }
};
$('backup').onclick = () => {
  const snapshot = {};
  for (const lesson of lessons) {
    snapshot[lesson.id] = {};
    for (const [path, source] of Object.entries(lesson.files)) {
      if (path.endsWith('.js') && !path.endsWith('.test.js')) snapshot[lesson.id][path] = drafts[lesson.id]?.[path] ?? source;
    }
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, drafts: snapshot }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'backend-lab-bai-lam.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('restore').onchange = async e => {
  try {
    const file = e.target.files[0]; if (!file) return;
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1 || !backup.drafts || typeof backup.drafts !== 'object' || Array.isArray(backup.drafts)) throw new Error('File sao lưu không hợp lệ.');
    const merged = JSON.parse(JSON.stringify(drafts));
    let count = 0;
    for (const lesson of lessons) {
      const imported = backup.drafts[lesson.id];
      if (!imported || typeof imported !== 'object') continue;
      for (const path of Object.keys(lesson.files)) {
        if (!path.endsWith('.js') || path.endsWith('.test.js') || typeof imported[path] !== 'string') continue;
        merged[lesson.id] ??= {}; merged[lesson.id][path] = imported[path]; count++;
      }
    }
    if (!count) throw new Error('Không có bài làm phù hợp để nhập.');
    if (!confirm(`Nhập ${count} file? File trùng sẽ được thay thế. Hãy xuất bản sao lưu trước nếu cần.`)) return;
    localStorage.setItem(prefix + 'drafts', JSON.stringify(merged)); drafts = merged; loadFile();
    alert(`Đã nhập ${count} file.`);
  } catch (error) { alert(error.message); } finally { e.target.value = ''; }
};
try {
  const response = await fetch('./lessons.json');
  if (!response.ok) throw new Error('Không tải được dữ liệu bài học.');
  lessons = await response.json();
  const weeks = [...new Set(lessons.map(l => l.id.split('-')[0]))];
  weeks.forEach(w => $('week').add(new Option(w === 'nc' ? 'Nâng cao' : 'Tuần ' + w.slice(1), w)));
  let remembered; try { remembered = localStorage.getItem(prefix + 'lesson'); } catch {}
  choose(decodeURIComponent(location.hash.slice(1)) || remembered);
} catch (error) { $('title').textContent = 'Chưa tải được bài học'; $('notice').textContent = error.message + ' Hãy mở trang qua HTTP, không mở file HTML trực tiếp.'; }
