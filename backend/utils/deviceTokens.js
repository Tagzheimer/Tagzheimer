/**
 * Device token helpers
 * --------------------
 * Devices (ESP32 firmware, Android tracker app) authenticate using a
 * short signed JWT issued at pairing time. This decouples them from
 * Firebase user auth — the device only knows its serialNumber + the
 * accessToken returned by POST /api/devices/pair.
 *
 * In demo mode (DEMO_MODE=true), `mock-token` is also accepted for
 * any device, exactly like before — keeps zero-config testing working.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a random 32-byte hex secret for a device.
 */
function generatePairingSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the JWT signing secret. Fails closed in production: a missing
 * JWT_SECRET throws instead of falling back to a public dev string.
 * Tests and demo mode set JWT_SECRET explicitly (see tests/setup.js).
 */
function getJwtSecret() {
  const s = process.env.JWT_SECRET || process.env.DEVICE_JWT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'test' || process.env.DEMO_MODE === 'true') {
    return 'tagzheimer-dev-secret-change-me';
  }
  throw new Error('JWT_SECRET is required (generate with: openssl rand -hex 32)');
}

/**
 * Issue a JWT for a device. The token encodes { deviceId, serialNumber }
 * and is signed with the device's pairingSecret OR the global JWT secret
 * (if pairingSecret is null — happens for legacy/demo devices).
 *
 * Lifetime: 1 year (devices don't usually re-pair).
 */
function issueDeviceToken(device) {
  const payload = {
    kind: 'device',
    deviceId: String(device._id),
    serialNumber: device.serialNumber,
  };
  const secret = device.pairingSecret
    ? `${getJwtSecret()}:${device.pairingSecret}`
    : getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: '365d' });
}

/**
 * Verify a device token. Resolves with the decoded payload, throws on
 * invalid/expired tokens.
 *
 * To keep verification simple, we accept either:
 *   (a) a token signed with the global JWT secret (legacy/demo devices)
 *   (b) a token signed with the global secret + the device's pairingSecret
 *
 * For (b) we need to look up the device first. Callers pass a `findByDeviceId`
 * async function so we can stay model-agnostic (works with both real Mongoose
 * and the in-memory demo store).
 */
async function verifyDeviceToken(token, { findByDeviceId } = {}) {
  // First try global secret (legacy/demo)
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (_globalErr) {
    // fall through and try per-device secret
  }

  // Decode without verifying to extract deviceId
  const decoded = jwt.decode(token);
  if (!decoded || decoded.kind !== 'device' || !decoded.deviceId) {
    throw new Error('Invalid token format');
  }

  if (!findByDeviceId) {
    throw new Error('Per-device token verification requires a resolver');
  }

  const device = await findByDeviceId(decoded.deviceId);
  if (!device || !device.pairingSecret) {
    throw new Error('Device not found or no pairing secret');
  }

  return jwt.verify(token, `${getJwtSecret()}:${device.pairingSecret}`);
}

module.exports = {
  generatePairingSecret,
  getJwtSecret,
  issueDeviceToken,
  verifyDeviceToken,
};
