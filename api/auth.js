import { verifyAuth } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

  if (!AUTH_PASSWORD) {
    res.status(200).json({ ok: true });
    return;
  }

  if (verifyAuth(req)) {
    res.status(200).json({ ok: true });
    return;
  }

  const { password } = req.body;
  if (password === AUTH_PASSWORD) {
    const token = Buffer.from(`${Date.now()}:${Math.random()}`).toString('base64');
    res.status(200).json({ ok: true, token });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
}
