import { verifyAuth, getFragments, setFragments, getTrash, setTrash, formatTime } from '../../lib/store.js';

export default async function handler(req, res) {
  if (!verifyAuth(req)) { res.status(401).json({ error: '未授权' }); return; }
  const { method } = req;
  const { id } = req.query;

  if (method === 'PUT') {
    try {
      const body = req.body;
      const fragments = await getFragments();
      const target = fragments.find(f => String(f.id) === id);
      if (!target) {
        res.status(404).json({ error: '未找到' });
        return;
      }
      if (body.content !== undefined) {
        if (!body.content || !body.content.trim()) {
          res.status(400).json({ error: '内容不能为空' });
          return;
        }
        target.content = body.content.trim();
        target.updated_at = formatTime(new Date());
      }
      if (body.color !== undefined) {
        target.color = body.color;
      }
      if (body.category_id !== undefined) {
        target.category_id = body.category_id;
      }
      await setFragments(fragments);
      res.status(200).json(target);
    } catch (err) {
      res.status(500).json({ error: '更新失败' });
    }
    return;
  }

  if (method === 'DELETE') {
    try {
      const fragments = await getFragments();
      const target = fragments.find(f => String(f.id) === id);
      if (!target) {
        res.status(404).json({ error: '未找到' });
        return;
      }
      const trash = await getTrash();
      trash.unshift({ ...target, deleted_at: formatTime(new Date()) });
      await setTrash(trash);
      const remaining = fragments.filter(f => String(f.id) !== id);
      await setFragments(remaining);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: '删除失败' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
