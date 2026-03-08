import crypto from 'crypto';

const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12h

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromBase64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(payloadJson, secret) {
  return crypto.createHmac('sha256', secret).update(payloadJson).digest('base64url');
}

export function issueAdminToken(password, secret, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    p: crypto.createHash('sha256').update(password).digest('hex').slice(0, 16),
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadJson = JSON.stringify(payload);
  const encoded = base64url(payloadJson);
  const signature = sign(payloadJson, secret);
  return `${encoded}.${signature}`;
}

export function verifyAdminToken(token, password, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'Missing token' };
  }

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return { ok: false, reason: 'Invalid token format' };
  }

  try {
    const payloadJson = fromBase64url(encoded);
    const expectedSig = sign(payloadJson, secret);
    if (signature !== expectedSig) {
      return { ok: false, reason: 'Invalid token signature' };
    }

    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.exp || now > payload.exp) {
      return { ok: false, reason: 'Token expired' };
    }

    const expectedPasswordHashPrefix = crypto.createHash('sha256').update(password).digest('hex').slice(0, 16);
    if (payload.p !== expectedPasswordHashPrefix) {
      return { ok: false, reason: 'Token/password mismatch' };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'Token parse failed' };
  }
}
