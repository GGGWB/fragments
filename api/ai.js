export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { content, catName } = req.body;
  if (!content) {
    res.status(400).json({ error: '内容不能为空' });
    return;
  }

  const API_URL = process.env.AI_API_URL || 'https://apihub.agnes-ai.com/v1/chat/completions';
  const API_KEY = process.env.AI_API_KEY;
  const MODEL = process.env.AI_MODEL || 'agnes-2.0-flash';

  if (!API_KEY) {
    res.status(500).json({ error: 'AI API 未配置' });
    return;
  }

  const prompt = `以下是用户"${catName || '全部'}"分类下的文字记录：\n\n${content}\n\n请根据以上内容：\n1. 用一句话（20字以内）预测文字主人最近在关注什么或想要做什么\n2. 基于这些内容给出1-2条简短建议（每条不超过15字）\n\n格式要求：\n关注：[你的预测]\n建议：[建议1]；[建议2]\n\n总字数控制在100字以内。`;

  try {
    const res_ = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    if (!res_.ok) throw new Error('AI API error');
    const data = await res_.json();
    const result = data.choices?.[0]?.message?.content?.trim() || '';
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: 'AI 分析失败' });
  }
}
