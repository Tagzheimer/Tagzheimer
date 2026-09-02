/**
 * Supabase client initialization
 * ------------------------------
 * Two clients:
 *  - supabaseService: uses the SERVICE ROLE key, bypasses RLS. Used by the
 *    backend to write locations, manage devices, etc.
 *  - supabaseAnon: uses the ANON key, subject to RLS. Used for the
 *    pairing endpoint (which is permissionless / public-safe).
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

let _serviceClient = null;
let _anonClient = null;

function getServiceClient() {
  if (!_serviceClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required (set in .env)');
    }
    _serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

function getAnonClient() {
  if (!_anonClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required (set in .env)');
    }
    _anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _anonClient;
}

/**
 * Get the JWT secret used by Supabase to sign user JWTs.
 * Used by middleware/auth.js to verify Bearer tokens.
 */
function getJwtSecret() {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET is required (Settings → API → JWT Settings → JWT Secret)');
  }
  return SUPABASE_JWT_SECRET;
}

function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY && SUPABASE_JWT_SECRET);
}

module.exports = {
  getServiceClient,
  getAnonClient,
  getJwtSecret,
  isSupabaseConfigured,
};
