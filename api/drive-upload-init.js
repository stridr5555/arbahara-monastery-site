import { verifyAdminToken } from './_adminAuth.js';
import { getGoogleAccessToken } from './_googleAuth.js';

function sanitizeFilename(name = '') {
  return name
    .replace(/[^a-zA-Z0-9._#\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.RECORDINGS_ADMIN_PASSWORD;
  const sessionSecret = process.env.RECORDINGS_SESSION_SECRET;
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!adminPassword || !sessionSecret || !driveFolderId) {
    return res.status(500).json({ error: 'Missing Drive upload configuration' });
  }

  const { token, filename, contentType = 'audio/mpeg', sizeBytes } = req.body ?? {};
  const verified = verifyAdminToken(token, adminPassword, sessionSecret);
  if (!verified.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const safeName = sanitizeFilename(filename || '');
  if (!safeName.toLowerCase().endsWith('.mp3')) {
    return res.status(400).json({ error: 'Only MP3 files are supported' });
  }

  try {
    const accessToken = await getGoogleAccessToken('https://www.googleapis.com/auth/drive');
    const initResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': String(sizeBytes || 0),
      },
      body: JSON.stringify({
        name: safeName,
        mimeType: 'audio/mpeg',
        parents: [driveFolderId],
      }),
    });

    if (!initResp.ok) {
      const txt = await initResp.text();
      console.error('Drive init failed', txt);
      return res.status(initResp.status).json({ error: 'Drive upload init failed', detail: txt.slice(0, 500) });
    }

    const uploadUrl = initResp.headers.get('location');
    if (!uploadUrl) {
      return res.status(500).json({ error: 'Drive did not return upload URL' });
    }

    return res.status(200).json({ ok: true, uploadUrl, filename: safeName });
  } catch (error) {
    console.error('Drive upload init error', error);
    return res.status(500).json({ error: error.message || 'Drive upload init failed' });
  }
}
