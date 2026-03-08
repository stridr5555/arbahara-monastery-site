import { verifyAdminToken } from './_adminAuth.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export default async function handler(req, res) {
  const adminPassword = process.env.RECORDINGS_ADMIN_PASSWORD;
  const sessionSecret = process.env.RECORDINGS_SESSION_SECRET;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://www.haramonastery.org/api/google-oauth-callback';

  if (!adminPassword || !sessionSecret || !clientId) {
    return res.status(500).send('Missing Google OAuth configuration');
  }

  const { token, origin } = req.query ?? {};
  const verified = verifyAdminToken(token, adminPassword, sessionSecret);
  if (!verified.ok) {
    return res.status(401).send('Unauthorized');
  }

  const stateObj = {
    token,
    origin: typeof origin === 'string' ? origin : 'https://www.haramonastery.org',
    nonce: Math.random().toString(36).slice(2),
    t: Date.now(),
  };

  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/drive.file',
    state,
  });

  return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
