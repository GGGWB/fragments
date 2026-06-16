const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 10086;
const DATA_FILE = path.join(__dirname, 'data', 'fragments.json');
const TRASH_FILE = path.join(__dirname, 'data', 'trash.json');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');

// 确保 data 目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// ── 数据读写（带文件锁）──

const fileLocks = new Map();

async function withLock(file, fn) {
  while (fileLocks.get(file)) {
    await new Promise(r => setTimeout(r, 10));
  }
  fileLocks.set(file, true);
  try { return await fn(); }
  finally { fileLocks.delete(file); }
}

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function readFragments() { return readJSON(DATA_FILE); }
function writeFragments(data) { writeJSON(DATA_FILE, data); }
function readTrash() { return readJSON(TRASH_FILE); }
function writeTrash(data) { writeJSON(TRASH_FILE, data); }
function readCategories() { return readJSON(CATEGORIES_FILE); }
function writeCategories(data) { writeJSON(CATEGORIES_FILE, data); }

// ── 工具函数 ──

function getBody(req) {
  return new Promise((resolve, reject) => {
    const MAX_BODY = 1024 * 1024;
    let body = '';
    let truncated = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) { truncated = true; req.destroy(); }
    });
    req.on('end', () => {
      if (truncated) { resolve(null); return; }
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function formatTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 清理超过 3 天的回收站条目
function cleanExpiredTrash() {
  const trash = readTrash();
  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  const valid = trash.filter(item => {
    const deleted = new Date(item.deleted_at.replace(' ', 'T')).getTime();
    return now - deleted < THREE_DAYS;
  });
  if (valid.length !== trash.length) {
    writeTrash(valid);
  }
}

// 启动时清理一次，之后每小时清理
cleanExpiredTrash();
setInterval(cleanExpiredTrash, 60 * 60 * 1000);

// ── 路由处理 ──

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ── 静态文件 ──
  if (req.method === 'GET' && url.pathname === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(html);
    return;
  }

  // ── API: 获取碎片 ──
  if (req.method === 'GET' && url.pathname === '/api/fragments') {
    let fragments = readFragments();
    const categoryId = url.searchParams.get('category_id');
    if (categoryId) {
      fragments = fragments.filter(f => f.category_id === categoryId);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(fragments));
    return;
  }

  // ── API: 新增碎片 ──
  if (req.method === 'POST' && url.pathname === '/api/fragments') {
    const { content, category_id } = await getBody(req);
    if (content === null) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '内容过大' }));
      return;
    }
    if (!content || !content.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '内容不能为空' }));
      return;
    }
    const result = await withLock(DATA_FILE, () => {
      const fragments = readFragments();
      const fragment = {
        id: generateId(),
        content: content.trim(),
        created_at: formatTime(new Date()),
        color: '',
        category_id: category_id || ''
      };
      fragments.unshift(fragment);
      writeFragments(fragments);
      return fragment;
    });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── API: 排序碎片 ──
  if (req.method === 'PUT' && url.pathname === '/api/fragments/reorder') {
    const { ids } = await getBody(req);
    if (!Array.isArray(ids)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '参数错误' }));
      return;
    }
    await withLock(DATA_FILE, () => {
      let fragments = readFragments();
      const idSet = new Set(ids);
      const ordered = ids.map(id => fragments.find(f => String(f.id) === String(id))).filter(Boolean);
      const rest = fragments.filter(f => !idSet.has(f.id));
      writeFragments([...ordered, ...rest]);
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── API: 编辑碎片（内容 / 颜色 / 分类）──
  if (req.method === 'PUT' && /^\/api\/fragments\/\w+$/.test(url.pathname)) {
    const id = url.pathname.split('/').pop();
    const body = await getBody(req);
    if (body === null) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '内容过大' }));
      return;
    }
    const result = await withLock(DATA_FILE, () => {
      let fragments = readFragments();
      const target = fragments.find(f => String(f.id) === id);
      if (!target) return null;
      if (body.content !== undefined) {
        if (!body.content || !body.content.trim()) return 'empty';
        target.content = body.content.trim();
        target.updated_at = formatTime(new Date());
      }
      if (body.color !== undefined) {
        target.color = body.color;
      }
      if (body.category_id !== undefined) {
        target.category_id = body.category_id;
      }
      writeFragments(fragments);
      return target;
    });
    if (result === null) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到' }));
      return;
    }
    if (result === 'empty') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '内容不能为空' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── API: 删除碎片（移入回收站）──
  if (req.method === 'DELETE' && /^\/api\/fragments\/\w+$/.test(url.pathname)) {
    const id = url.pathname.split('/').pop();
    let found = false;
    await withLock(DATA_FILE, async () => {
      await withLock(TRASH_FILE, () => {
        let fragments = readFragments();
        const target = fragments.find(f => String(f.id) === id);
        if (!target) return;
        found = true;
        const trash = readTrash();
        trash.unshift({ ...target, deleted_at: formatTime(new Date()) });
        writeTrash(trash);
        fragments = fragments.filter(f => String(f.id) !== id);
        writeFragments(fragments);
      });
    });
    res.writeHead(found ? 204 : 404);
    res.end();
    return;
  }

  // ── API: 获取回收站 ──
  if (req.method === 'GET' && url.pathname === '/api/trash') {
    cleanExpiredTrash();
    const trash = readTrash();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(trash));
    return;
  }

  // ── API: 恢复回收站条目 ──
  if (req.method === 'POST' && /^\/api\/trash\/\w+\/restore$/.test(url.pathname)) {
    const id = url.pathname.split('/')[3];
    const result = await withLock(TRASH_FILE, () => {
      let trash = readTrash();
      const target = trash.find(f => String(f.id) === id);
      if (!target) return null;
      const fragments = readFragments();
      const { deleted_at, ...fragment } = target;
      fragments.unshift(fragment);
      writeFragments(fragments);
      trash = trash.filter(f => String(f.id) !== id);
      writeTrash(trash);
      return fragment;
    });
    if (result) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到' }));
    }
    return;
  }

  // ── API: 永久删除单条 ──
  if (req.method === 'DELETE' && /^\/api\/trash\/\w+$/.test(url.pathname)) {
    const id = url.pathname.split('/').pop();
    await withLock(TRASH_FILE, () => {
      let trash = readTrash();
      trash = trash.filter(f => String(f.id) !== id);
      writeTrash(trash);
    });
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API: 清空回收站 ──
  if (req.method === 'DELETE' && url.pathname === '/api/trash') {
    await withLock(TRASH_FILE, () => writeTrash([]));
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API: 获取所有页签 ──
  if (req.method === 'GET' && url.pathname === '/api/categories') {
    const categories = readCategories();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(categories));
    return;
  }

  // ── API: 新增页签 ──
  if (req.method === 'POST' && url.pathname === '/api/categories') {
    const { name } = await getBody(req);
    if (!name || !name.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '名称不能为空' }));
      return;
    }
    const result = await withLock(CATEGORIES_FILE, () => {
      const categories = readCategories();
      const category = {
        id: generateId(),
        name: name.trim(),
        created_at: formatTime(new Date())
      };
      categories.push(category);
      writeCategories(categories);
      return category;
    });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── API: 编辑页签 ──
  if (req.method === 'PUT' && /^\/api\/categories\/\w+$/.test(url.pathname)) {
    const id = url.pathname.split('/').pop();
    const { name } = await getBody(req);
    if (!name || !name.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '名称不能为空' }));
      return;
    }
    const result = await withLock(CATEGORIES_FILE, () => {
      let categories = readCategories();
      const target = categories.find(c => c.id === id);
      if (!target) return null;
      target.name = name.trim();
      writeCategories(categories);
      return target;
    });
    if (result === null) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // ── API: 删除页签 ──
  if (req.method === 'DELETE' && /^\/api\/categories\/\w+$/.test(url.pathname)) {
    const id = url.pathname.split('/').pop();
    const keepFragments = url.searchParams.get('keep') === '1';
    let found = false;
    await withLock(CATEGORIES_FILE, () => {
      let categories = readCategories();
      const target = categories.find(c => String(c.id) === id);
      if (!target) return;
      found = true;
      categories = categories.filter(c => String(c.id) !== id);
      writeCategories(categories);
    });
    if (!found) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到' }));
      return;
    }
    await withLock(DATA_FILE, () => {
      let fragments = readFragments();
      if (keepFragments) {
        fragments.forEach(f => { if (String(f.category_id) === id) f.category_id = ''; });
      } else {
        fragments = fragments.filter(f => String(f.category_id) !== id);
      }
      writeFragments(fragments);
    });
    res.writeHead(204);
    res.end();
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

// 获取局域网 IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('  ✦ 碎片文字记录');
  console.log('');
  console.log(`  本地访问:  http://localhost:${PORT}`);
  console.log(`  局域网:    http://${localIP}:${PORT}`);
  console.log('');
});
