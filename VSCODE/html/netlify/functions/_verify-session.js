const crypto = require('crypto');

function verifySession(authorizationHeader) {
  if (
    !authorizationHeader ||
    !authorizationHeader.startsWith('Bearer ')
  ) {
    return null;
  }

  const token = authorizationHeader.slice(7);

  try {
    const decoded =
      Buffer.from(token, 'base64').toString('utf8');

    const parts = decoded.split('|');

    if (parts.length !== 5) {
      return null;
    }

    const [
      name,
      role,
      classId,
      expiry,
      sig
    ] = parts;

    const SESSION_SECRET =
      process.env.SESSION_SECRET || '';

    if (!SESSION_SECRET) {
      return null;
    }

    const raw =
      `${name}|${role}|${classId}|${expiry}`;

    const expectedSig =
      crypto
        .createHmac(
          'sha256',
          SESSION_SECRET
        )
        .update(raw)
        .digest('hex');

    const sigBuf =
      Buffer.from(sig);

    const expectedSigBuf =
      Buffer.from(expectedSig);

    if (
      sigBuf.length !==
      expectedSigBuf.length ||
      !crypto.timingSafeEqual(
        sigBuf,
        expectedSigBuf
      )
    ) {
      return null;
    }

    const expiryNumber =
      Number(expiry);

    if (
      !Number.isFinite(expiryNumber) ||
      Date.now() > expiryNumber
    ) {
      return null;
    }

    return {
      name,
      role,
      classId: classId || null
    };

  } catch {
    return null;
  }
}

module.exports = {
  verifySession
};