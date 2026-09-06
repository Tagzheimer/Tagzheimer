const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate limiters — three layers.
 *
 * Why three: the original design had two IP-based buckets (200 general +
 * 100 ingest per 15 min) and users behind one egress IP kept tripping them
 * with a single phone. Two structural causes:
 *
 *   1. No `trust proxy` was set, so behind Fly/Render/nginx every client
 *      shared ONE bucket (req.ip = the proxy). Fixed in server.js.
 *   2. IP buckets punish NAT sharing (phone + laptop on one WiFi, carrier-
 *      grade NAT, whole families). Ingest is therefore ALSO limited per
 *      tracked device — a fair share no neighbor can eat.
 *
 * Budgets (per 15 min window):
 *   limiter       600/IP   — dashboard polling (devices + N×history / 30s)
 *   updateLimiter 300/IP   — backstop against device-farms on one IP
 *   deviceLimiter  60/device — ~1 fix / 15s: 4× headroom over the 60s
 *                    tracker cadence (immediate cycles, SYNC double-fire,
 *                    manual SEND NOW, retries). Batch drains count as 1 hit
 *                    so offline syncs are never punished.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Update rate limit exceeded' },
});

/**
 * Post-auth per-device limiter. Mount INSIDE the location router AFTER
 * verifyFirebaseToken so req.user + req.body are available for identity.
 * Requires express.json() earlier in the chain (it is, in server.js).
 */
const deviceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    try {
      if (req.user?.isDevice && req.user.deviceId) {
        return `dev:${String(req.user.deviceId).toLowerCase()}`;
      }
      const b = req.body || {};
      if (b.deviceId != null && typeof b.deviceId !== 'object') {
        return `id:${String(b.deviceId).toLowerCase()}`;
      }
      if (typeof b.serialNumber === 'string' && b.serialNumber.trim()) {
        return `sn:${b.serialNumber.trim().toLowerCase()}`;
      }
      if (req.user?.uid) {
        return `u:${String(req.user.uid).toLowerCase()}`;
      }
    } catch {
      // fall through to IP fallback
    }
    return ipKeyGenerator(req);
  },
  message: {
    success: false,
    message: 'Tracker rate limit exceeded (max ~60 fixes per 15 min per device). Raise the update interval or retry after the window resets.',
  },
});

module.exports = { limiter, updateLimiter, deviceLimiter };
