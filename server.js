const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 10086;
const DATA_FILE = path.join(__dirname, 'data', 'fragments.json');
const TRASH_FILE = path.join(__dirname, 'data', 'trash.json');

// 确保 data 目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// ── 数据读写 ──

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

// ── 工具函数 ──

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ── API: 获取碎片 ──
  if (req.method === 'GET' && url.pathname === '/api/fragments') {
    const fragments = readFragments();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fragments));
    return;
  }

  // ── API: 新增碎片 ──
  if (req.method === 'POST' && url.pathname === '/api/fragments') {
    const { content } = await getBody(req);
    if (!content || !content.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '内容不能为空' }));
      return;
    }
    const fragments = readFragments();
    const fragment = {
      id: Date.now(),
      content: content.trim(),
      created_at: formatTime(new Date()),
      color: ''
    };
    fragments.unshift(fragment);
    writeFragments(fragments);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fragment));
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
    let fragments = readFragments();
    const idSet = new Set(ids);
    const ordered = ids.map(id => fragments.find(f => f.id === id)).filter(Boolean);
    const rest = fragments.filter(f => !idSet.has(f.id));
    writeFragments([...ordered, ...rest]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── API: 编辑碎片（内容 / 颜色）──
  if (req.method === 'PUT' && /^\/api\/fragments\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split('/').pop());
    const body = await getBody(req);
    let fragments = readFragments();
    const target = fragments.find(f => f.id === id);
    if (!target) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到' }));
      return;
    }
    if (body.content !== undefined) {
      if (!body.content || !body.content.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '内容不能为空' }));
        return;
      }
      target.content = body.content.trim();
      target.created_at = formatTime(new Date());
    }
    if (body.color !== undefined) {
      target.color = body.color;
    }
    writeFragments(fragments);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(target));
    return;
  }

  // ── API: 删除碎片（移入回收站）──
  if (req.method === 'DELETE' && /^\/api\/fragments\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split('/').pop());
    let fragments = readFragments();
    const target = fragments.find(f => f.id === id);
    if (target) {
      // 移入回收站
      const trash = readTrash();
      trash.unshift({ ...target, deleted_at: formatTime(new Date()) });
      writeTrash(trash);
      // 从碎片列表移除
      fragments = fragments.filter(f => f.id !== id);
      writeFragments(fragments);
    }
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API: 获取回收站 ──
  if (req.method === 'GET' && url.pathname === '/api/trash') {
    cleanExpiredTrash();
    const trash = readTrash();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(trash));
    return;
  }

  // ── API: 恢复回收站条目 ──
  if (req.method === 'POST' && /^\/api\/trash\/\d+\/restore$/.test(url.pathname)) {
    const id = Number(url.pathname.split('/')[3]);
    let trash = readTrash();
    const target = trash.find(f => f.id === id);
    if (target) {
      // 移回碎片列表
      const fragments = readFragments();
      const { deleted_at, ...fragment } = target;
      fragments.unshift(fragment);
      writeFragments(fragments);
      // 从回收站移除
      trash = trash.filter(f => f.id !== id);
      writeTrash(trash);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fragment));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未找到' }));
    }
    return;
  }

  // ── API: 永久删除单条 ──
  if (req.method === 'DELETE' && /^\/api\/trash\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.split('/').pop());
    let trash = readTrash();
    trash = trash.filter(f => f.id !== id);
    writeTrash(trash);
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API: 清空回收站 ──
  if (req.method === 'DELETE' && url.pathname === '/api/trash') {
    writeTrash([]);
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
