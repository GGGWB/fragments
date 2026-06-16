import { getCategories, setCategories, generateId, formatTime } from '../../lib/store.js';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const categories = await getCategories();
      res.status(200).json(categories);
    } catch (err) {
      res.status(500).json({ error: '加载失败' });
    }
    return;
  }

  if (method === 'POST') {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: '名称不能为空' });
        return;
      }
      const categories = await getCategories();
      const category = {
        id: generateId(),
        name: name.trim(),
        created_at: formatTime(new Date())
      };
      categories.push(category);
      await setCategories(categories);
      res.status(201).json(category);
    } catch (err) {
      res.status(500).json({ error: '创建失败' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
