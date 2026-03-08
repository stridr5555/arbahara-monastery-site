import { verifyAdminToken } from './_adminAuth.js';

const GITHUB_API = 'https://api.github.com';

function sanitizeFilename(name = '') {
  return name
    .replace(/[^a-zA-Z0-9._#\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getExistingSha({ owner, repo, branch, path, token }) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'arbahara-monastery-site',
    },
  });

  if (resp.status === 404) return null;
  if (!resp.ok) {
    const data = await resp.text();
    throw new Error(`GitHub read failed: ${resp.status} ${data}`);
  }

  const data = await resp.json();
  return data?.sha ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.RECORDINGS_ADMIN_PASSWORD;
  const sessionSecret = process.env.RECORDINGS_SESSION_SECRET;

  const githubToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'stridr5555';
  const repo = process.env.GITHUB_REPO || 'arbahara-monastery-site';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!adminPassword || !sessionSecret || !githubToken) {
    return res.status(500).json({ error: 'Missing server configuration' });
  }

  const { token, filename, dataBase64, contentType } = req.body ?? {};
  const verified = verifyAdminToken(token, adminPassword, sessionSecret);
  if (!verified.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required' });
  }
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    return res.status(400).json({ error: 'File data is required' });
  }

  const safeName = sanitizeFilename(filename);
  if (!safeName.toLowerCase().endsWith('.mp3')) {
    return res.status(400).json({ error: 'Only MP3 uploads are supported' });
  }

  const targetPath = `assets/audio/raw/${safeName}`;

  try {
    const existingSha = await getExistingSha({ owner, repo, branch, path: targetPath, token: githubToken });

    const putUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`;
    const commitMessage = `${existingSha ? 'update' : 'add'} recording: ${safeName}`;

    const payload = {
      message: commitMessage,
      content: dataBase64,
      branch,
      sha: existingSha || undefined,
    };

    const resp = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'arbahara-monastery-site',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('GitHub upload failed', data);
      return res.status(resp.status).json({ error: data?.message || 'GitHub upload failed' });
    }

    return res.status(200).json({
      ok: true,
      path: targetPath,
      htmlUrl: data?.content?.html_url,
      commitUrl: data?.commit?.html_url,
      contentType: contentType || 'audio/mpeg',
    });
  } catch (error) {
    console.error('Upload error', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
