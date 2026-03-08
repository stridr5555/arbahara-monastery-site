const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function htmlEscape(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://www.haramonastery.org/api/google-oauth-callback';

  if (!clientId || !clientSecret) {
    return res.status(500).send('Missing Google OAuth env vars');
  }

  const { code, state, error } = req.query ?? {};

  if (error) {
    return res.status(400).send(`OAuth error: ${htmlEscape(error)}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing OAuth code/state');
  }

  let parsedState;
  try {
    parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    return res.status(400).send('Invalid OAuth state');
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenResp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const data = await tokenResp.json();
    if (!tokenResp.ok || !data.access_token) {
      return res.status(500).send(`Token exchange failed: ${htmlEscape(JSON.stringify(data))}`);
    }

    const payload = {
      type: 'google-oauth-success',
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      scope: data.scope,
      token: parsedState.token,
    };

    const targetOrigin = parsedState?.origin || 'https://www.haramonastery.org';

    return res.status(200).send(`<!doctype html>
<html><body><script>
(function(){
  const payload = ${JSON.stringify(payload)};
  const targetOrigin = ${JSON.stringify(targetOrigin)};
  if (window.opener && window.opener !== window) {
    try {
      window.opener.postMessage(payload, targetOrigin);
    } catch (e) {
      window.opener.postMessage(payload, '*');
    }
    window.close();
  } else {
    document.body.innerText = 'Google connected. You can close this tab.';
  }
})();
</script></body></html>`);
  } catch (err) {
    return res.status(500).send(`OAuth callback error: ${htmlEscape(err.message || 'unknown')}`);
  }
}
