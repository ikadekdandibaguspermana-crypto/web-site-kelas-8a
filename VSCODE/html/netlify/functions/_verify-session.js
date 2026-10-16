const crypto = require('crypto');

function verifySession(authorizationHeader) {
  if (
    typeof authorizationHeader !== 'string' ||
    !authorizationHeader.startsWith('Bearer ')
  ) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();
  const secret = process.env.SESSION_SECRET || '';

  if (!token || !secret) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  if (!payloadEncoded || !/^[a-f0-9]{64}$/i.test(signature)) return null;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadEncoded)
    .digest('hex');

  const actualBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSignature, 'hex');

  if (
    actualBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadEncoded, 'base64url').toString('utf8')
    );

    if (
      !payload ||
      typeof payload.accountId !== 'string' ||
      !payload.accountId ||
      typeof payload.name !== 'string' ||
      !['admin', 'student', 'guru'].includes(payload.role) ||
      !Number.isFinite(payload.expiry) ||
      Date.now() >= payload.expiry
    ) {
      return null;
    }

    return {
      accountId: payload.accountId,
      name: payload.name,
      role: payload.role,
      classId: payload.classId || null,
      assignedClasses: Array.isArray(payload.assignedClasses)
        ? payload.assignedClasses
        : [],
      expiry: payload.expiry
    };
  } catch {
    return null;
  }
}

module.exports = { verifySession };
