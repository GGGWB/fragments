import { verifyAuth, getTrash, setTrash, cleanExpiredTrash } from '../../lib/store.js';

export default async function handler(req, res) {
  if (!verifyAuth(req)) { res.status(401).json({ error: '未授权' }); return; }
  const { method } = req;

  if (method === 'GET') {
    try {
      let trash = await getTrash();
      trash = cleanExpiredTrash(trash);
      await setTrash(trash);
      res.status(200).json(trash);
    } catch (err) {
      res.status(500).json({ error: '加载失败' });
    }
    return;
  }

  if (method === 'DELETE') {
    try {
      await setTrash([]);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: '清空失败' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
