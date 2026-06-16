import { getTrash, setTrash } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { id } = req.query;
    let trash = await getTrash();
    trash = trash.filter(f => String(f.id) !== id);
    await setTrash(trash);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
}
