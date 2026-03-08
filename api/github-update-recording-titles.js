import { verifyAdminToken } from './_adminAuth.js';

const GITHUB_API = 'https://api.github.com';

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
    const txt = await resp.text();
    throw new Error(`Failed to read existing titles: ${txt}`);
  }

  const data = await resp.json();
  return data?.sha || null;
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

  const { token, titles } = req.body ?? {};
  const verified = verifyAdminToken(token, adminPassword, sessionSecret);
  if (!verified.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!titles || typeof titles !== 'object' || Array.isArray(titles)) {
    return res.status(400).json({ error: 'Invalid titles payload' });
  }

  const cleaned = {};
  for (const [k, v] of Object.entries(titles)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const title = String(v || '').trim();
    if (title) cleaned[k] = title.slice(0, 120);
  }

  const filePath = 'assets/audio/processed/titles.json';

  try {
    const sha = await getExistingSha({ owner, repo, branch, path: filePath, token: githubToken });
    const content = Buffer.from(JSON.stringify(cleaned, null, 2) + '\n', 'utf8').toString('base64');

    const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'arbahara-monastery-site',
      },
      body: JSON.stringify({
        message: 'Update recording titles',
        content,
        branch,
        sha: sha || undefined,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data?.message || 'Failed to save titles' });
    }

    return res.status(200).json({ ok: true, commitUrl: data?.commit?.html_url });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update titles' });
  }
}
