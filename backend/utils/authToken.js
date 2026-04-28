const crypto = require('crypto');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function base64urlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function getTokenSecret() {
  return process.env.AUTH_SECRET || process.env.DB_PASSWORD || 'careline-local-dev-secret';
}

function buildSignature(payloadSegment) {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(payloadSegment)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signAuthToken(payload) {
  const issuedAt = Date.now();
  const signedPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_MS,
  };
  const payloadSegment = base64urlEncode(JSON.stringify(signedPayload));
  const signature = buildSignature(payloadSegment);
  return `${payloadSegment}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || !token.includes('.')) {
    const error = new Error('Authentication token is missing or invalid');
    error.status = 401;
    throw error;
  }

  const [payloadSegment, signature] = token.split('.');
  const expectedSignature = buildSignature(payloadSegment);
  if (signature !== expectedSignature) {
    const error = new Error('Authentication token signature is invalid');
    error.status = 401;
    throw error;
  }

  const payload = JSON.parse(base64urlDecode(payloadSegment));
  if (!payload.exp || payload.exp < Date.now()) {
    const error = new Error('Authentication token has expired');
    error.status = 401;
    throw error;
  }

  return payload;
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
