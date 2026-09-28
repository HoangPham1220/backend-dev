// MUTANT: bản cài đặt có một bug cố ý. Test tốt phải FAIL khi chạy với file này.
// Chỉ mở file này khi đã tự viết test theo đặc tả mà vẫn không bắt được.
import http from 'node:http';
import { createHash } from 'node:crypto';

// Chỉ để demo. Hash mật khẩu thật: xem bài w8-01.
const demoHash = (password) => createHash('sha256').update(password).digest('hex');

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Không bao giờ trả passwordHash ra ngoài.
const toPublic = ({ id, email, name }) => ({ id, email, name });

export function createApp() {
  const customers = [];
  let nextId = 1;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'POST' && url.pathname === '/customers') {
      let body;
      try {
        body = await readJson(req);
      } catch {
        return sendJson(res, 400, { error: 'Body phải là JSON' });
      }
      const { email, name, password } = body ?? {};
      if (typeof email !== 'string' || !email.includes('@')) {
        return sendJson(res, 400, { error: 'Email không hợp lệ' });
      }
      if (typeof name !== 'string' || name.trim() === '') {
        return sendJson(res, 400, { error: 'Thiếu tên' });
      }
      if (typeof password !== 'string' || password.length < 8) {
        return sendJson(res, 400, { error: 'Mật khẩu tối thiểu 8 ký tự' });
      }
      if (customers.some((c) => c.email === email)) {
        return sendJson(res, 409, { error: 'Email đã tồn tại' });
      }
      const customer = { id: nextId++, email: email.toLowerCase(), name: name.trim(), passwordHash: demoHash(password) };
      customers.push(customer);
      return sendJson(res, 201, toPublic(customer));
    }

    const match = url.pathname.match(/^\/customers\/(\d+)$/);
    if (req.method === 'GET' && match) {
      const customer = customers.find((c) => c.id === Number(match[1]));
      if (!customer) return sendJson(res, 404, { error: 'Không tìm thấy khách hàng' });
      return sendJson(res, 200, toPublic(customer));
    }

    return sendJson(res, 404, { error: 'Không tìm thấy route' });
  });
}
