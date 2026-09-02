const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verifyDeviceToken } = require('../utils/deviceTokens');
const { isDemoMode } = require('../config/demoMode');
const { getServiceClient, isSupabaseConfigured, getJwtSecret } = require('../config/supabase');

// === JWKS support for asymmetric (ES256) Supabase tokens ===
let _jwks = { keys: null, fetchedAt: 0 };
const JWKS_TTL_MS = 10 * 60 * 1000;

function decodeJwtHeader(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  } catch {
    return null;
  }
}

async function fetchJwks() {
  const now = Date.now();
  if (_jwks.keys && now - _jwks.fetchedAt < JWKS_TTL_MS) return _jwks.keys;
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('SUPABASE_URL not set — cannot resolve JWKS');
  const res = await fetch(`${base}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  _jwks = { keys: data.keys || [], fetchedAt: now };
  return _jwks.keys;
}

/**
 * Verify a Supabase user JWT. Supports both signing schemes:
 *   ES256/RS256 → verify with the public key from the project's JWKS
 *   HS256       → verify with SUPABASE_JWT_SECRET (legacy projects)
 */
async function verifySupabaseJwt(token) {
  const header = decodeJwtHeader(token);
  const alg = header?.alg;

  if (alg === 'ES256' || alg === 'RS256') {
    const keys = await fetchJwks();
    const jwk = keys.find((k) => k.kid === header.kid && k.alg === alg);
    if (!jwk) {
      // Key may have been rotated since the cache was filled — refetch once.
      _jwks = { keys: null, fetchedAt: 0 };
      const fresh = await fetchJwks();
      const retry = fresh.find((k) => k.kid === header.kid && k.alg === alg);
      if (!retry) throw new Error('Unknown signing key (kid not found in JWKS)');
      return jwt.verify(token, crypto.createPublicKey({ key: retry, format: 'jwk' }), {
        algorithms: [alg],
      });
    }
    return jwt.verify(token, crypto.createPublicKey({ key: jwk, format: 'jwk' }), {
      algorithms: [alg],
    });
  }

  // Legacy symmetric tokens
  return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
}

/**
 * Auth middleware
 * --------------- * Accepts three token types:
 *
 *  1. `mock-token` (dev/demo mode only) — bypasses all checks
 *  2. **Device JWT** — issued by POST /api/devices/pair. Decoded as
 *     `{ kind: 'device', deviceId, serialNumber }`. Sets `req.user.isDevice = true`.
 *  3. **Supabase user JWT** — issued by Supabase Auth on signInWithPassword.
 *     Verified with the project's JWT secret. Sets `req.user.uid` from the `sub` claim.
 *
 * Supabase JWTs come in two flavors:
 *  - Legacy projects: HS256, signed with the project's JWT secret
 *    (Settings → API → JWT Settings → JWT Secret)
 *  - New projects (2025+): ES256 asymmetric keys published at
 *    /.well-known/jwks.json — verified with the public key, kid-selected.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];

    // === Demo / mock-token shortcut ===
    if ((process.env.NODE_ENV === 'development' || isDemoMode()) && token === 'mock-token') {
      req.user = { uid: 'demo-user-uuid', email: 'demo@tagzheimer.local', name: 'Demo User' };
      return next();
    }

    // === Try device token first (firmware + mobile tracker) ===
    try {
      const decoded = await verifyDeviceToken(token, {
        findByDeviceId: async (id) => {
          // Demo mode: look up in the in-memory store
          if (isDemoMode()) {
            const { getDemoStore } = require('../config/demoMode');
            const store = getDemoStore();
            const found = store.Device.findById(id);
            if (!found) return null;
            const lean = await found.lean();
            return {
              _id: lean._id,
              serialNumber: lean.serialNumber,
              pairingSecret: lean.pairingSecret,
            };
          }
          // Production: query Supabase
          if (!isSupabaseConfigured()) return null;
          const supabase = getServiceClient();
          const { data } = await supabase
            .from('devices')
            .select('id, serial_number, pairing_secret')
            .eq('id', id)
            .maybeSingle();
          return data ? { _id: data.id, serialNumber: data.serial_number, pairingSecret: data.pairing_secret } : null;
        },
      });
      if (decoded?.kind === 'device') {
        req.user = {
          uid: decoded.deviceId,
          isDevice: true,
          deviceId: decoded.deviceId,
          serialNumber: decoded.serialNumber,
        };
        return next();
      }
    } catch (_deviceErr) {
      // Not a device token — fall through to user JWT verification.
    }

    // === Supabase user JWT ===
    if (!isSupabaseConfigured()) {
      return res.status(401).json({
        success: false,
        message: 'Supabase not configured. Use mock-token in demo mode, or set SUPABASE_URL + SUPABASE_JWT_SECRET.',
      });
    }

    const decoded = await verifySupabaseJwt(token);

    // Supabase JWTs have: sub (user uuid), email, role, aud, exp, iat
    if (decoded.role === 'service_role') {
      // Service-role JWT — full access (shouldn't normally be sent by clients)
      req.user = { uid: decoded.sub, isServiceRole: true };
    } else {
      req.user = {
        uid: decoded.sub,
        email: decoded.email,
        name: decoded.user_metadata?.name || decoded.email?.split('@')[0],
      };
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = { verifyFirebaseToken: verifyToken, verifyAnyToken: verifyToken, verifyToken };
