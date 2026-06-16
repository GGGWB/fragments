import { getFragments, setFragments, generateId, formatTime } from '../../lib/store.js';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
};

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      let fragments = await getFragments();
      const { category_id } = req.query;
      if (category_id) {
        fragments = fragments.filter(f => f.category_id === category_id);
      }
      res.status(200).json(fragments);
    } catch (err) {
      res.status(500).json({ error: '加载失败' });
    }
    return;
  }

  if (method === 'POST') {
    try {
      const { content, category_id } = req.body;
      if (!content || !content.trim()) {
        res.status(400).json({ error: '内容不能为空' });
        return;
      }
      const fragments = await getFragments();
      const fragment = {
        id: generateId(),
        content: content.trim(),
        created_at: formatTime(new Date()),
        color: '',
        category_id: category_id || ''
      };
      fragments.unshift(fragment);
      await setFragments(fragments);
      res.status(201).json(fragment);
    } catch (err) {
      res.status(500).json({ error: '提交失败' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
