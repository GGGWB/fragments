import { kv } from '@vercel/kv';

const FRAGMENTS_KEY = 'fragments';
const TRASH_KEY = 'trash';
const CATEGORIES_KEY = 'categories';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function getFragments() {
  const data = await kv.get(FRAGMENTS_KEY);
  return Array.isArray(data) ? data : [];
}

async function setFragments(data) {
  await kv.set(FRAGMENTS_KEY, data);
}

async function getTrash() {
  const data = await kv.get(TRASH_KEY);
  return Array.isArray(data) ? data : [];
}

async function setTrash(data) {
  await kv.set(TRASH_KEY, data);
}

async function getCategories() {
  const data = await kv.get(CATEGORIES_KEY);
  return Array.isArray(data) ? data : [];
}

async function setCategories(data) {
  await kv.set(CATEGORIES_KEY, data);
}

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
