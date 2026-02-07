export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texts, target = 'am' } = req.body ?? {};
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'No texts provided' });
  }

  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Translation API key is not configured' });
  }

  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, target, format: 'text' }),
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data.error?.message ?? 'Translation failed' });
  }

  return res.status(200).json(data);
}
