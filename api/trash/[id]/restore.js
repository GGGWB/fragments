import { getTrash, setTrash, getFragments, setFragments } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { id } = req.query;
    const trash = await getTrash();
    const target = trash.find(f => String(f.id) === id);
    if (!target) {
      res.status(404).json({ error: '未找到' });
      return;
    }

    const fragments = await getFragments();
    const { deleted_at, ...fragment } = target;
    fragments.unshift(fragment);
    await setFragments(fragments);

    const remaining = trash.filter(f => String(f.id) !== id);
    await setTrash(remaining);

    res.status(200).json(fragment);
  } catch (err) {
    res.status(500).json({ error: '恢复失败' });
  }
}
