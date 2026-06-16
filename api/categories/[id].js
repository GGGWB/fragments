import { getCategories, setCategories, getFragments, setFragments } from '../../lib/store.js';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (method === 'PUT') {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: '名称不能为空' });
        return;
      }
      const categories = await getCategories();
      const target = categories.find(c => c.id === id);
      if (!target) {
        res.status(404).json({ error: '未找到' });
        return;
      }
      target.name = name.trim();
      await setCategories(categories);
      res.status(200).json(target);
    } catch (err) {
      res.status(500).json({ error: '更新失败' });
    }
    return;
  }

  if (method === 'DELETE') {
    try {
      const keepFragments = req.query.keep === '1';
      const categories = await getCategories();
      const target = categories.find(c => String(c.id) === id);
      if (!target) {
        res.status(404).json({ error: '未找到' });
        return;
      }
      const remaining = categories.filter(c => String(c.id) !== id);
      await setCategories(remaining);

      const fragments = await getFragments();
      if (keepFragments) {
        fragments.forEach(f => {
          if (String(f.category_id) === id) f.category_id = '';
        });
      } else {
        fragments = fragments.filter(f => String(f.category_id) !== id);
      }
      await setFragments(fragments);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: '删除失败' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
