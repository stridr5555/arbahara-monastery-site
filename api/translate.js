const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const DEFAULT_TARGET = 'am';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texts, target = DEFAULT_TARGET } = req.body ?? {};
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'No texts provided' });
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Google Translate API key' });
  }

  try {
    const response = await fetch(`${TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, target, format: 'text' }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Google Translate error', data);
      return res.status(response.status).json({ error: data.error?.message ?? 'Translation failed' });
    }

    const translations = data?.data?.translations?.map((entry) => entry.translatedText) ?? [];
    return res.status(200).json({ translations });
  } catch (error) {
    console.error('Translation request failed', error);
    return res.status(500).json({ error: 'Translation request failed' });
  }
}
