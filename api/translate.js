import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const client = new TranslateClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const DEFAULT_TARGET = 'am';
const DEFAULT_SOURCE = 'auto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texts, target = DEFAULT_TARGET } = req.body ?? {};
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'No texts provided' });
  }

  try {
    const command = new TranslateTextCommand({
      SourceLanguageCode: DEFAULT_SOURCE,
      TargetLanguageCode: target,
      Text: texts.join('\n'),
      Settings: { Formality: 'FORMAL' },
    });
    const response = await client.send(command);
    const translated = (response.TranslatedText ?? '').split('\n');
    return res.status(200).json({ translated });
  } catch (error) {
    console.error('Translate error', error);
    return res
      .status(500)
      .json({ error: error.message ?? 'Translation failed' });
  }
}
