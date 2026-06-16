import { getFragments, setFragments } from '../../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: '参数错误' });
      return;
    }
    const fragments = await getFragments();
    const idSet = new Set(ids);
    const ordered = ids.map(id => fragments.find(f => String(f.id) === String(id))).filter(Boolean);
    const rest = fragments.filter(f => !idSet.has(f.id));
    await setFragments([...ordered, ...rest]);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '排序失败' });
  }
}
