const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisRequest(command, ...args) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis 环境变量未配置');
  }
  const body = [command, ...args];
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function getData(key) {
  const raw = await redisRequest('GET', key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function setData(key, data) {
  await redisRequest('SET', key, JSON.stringify(data));
}

async function getFragments() { return getData('fragments'); }
async function setFragments(data) { await setData('fragments', data); }
async function getTrash() { return getData('trash'); }
async function setTrash(data) { await setData('trash', data); }
async function getCategories() { return getData('categories'); }
async function setCategories(data) { await setData('categories', data); }

function cleanExpiredTrash(trash) {
  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  return trash.filter(item => {
    const deleted = new Date(item.deleted_at.replace(' ', 'T')).getTime();
    return now - deleted < THREE_DAYS;
  });
}

export {
  generateId,
  formatTime,
  getFragments,
  setFragments,
  getTrash,
  setTrash,
  getCategories,
  setCategories,
  cleanExpiredTrash
};
