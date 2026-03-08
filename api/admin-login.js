import { issueAdminToken } from './_adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.RECORDINGS_ADMIN_PASSWORD;
  const sessionSecret = process.env.RECORDINGS_SESSION_SECRET;
  if (!adminPassword || !sessionSecret) {
    return res.status(500).json({ error: 'Missing admin auth configuration' });
  }

  const { password } = req.body ?? {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = issueAdminToken(adminPassword, sessionSecret);
  return res.status(200).json({ token, expiresInSeconds: 60 * 60 * 12 });
}
