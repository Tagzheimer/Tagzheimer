process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-for-tests';
process.env.NODE_ENV = 'test';

import { createRequire } from 'module';

// The app chain (server.js → controllers) is CommonJS and loads
// config/demoMode.js via require(). Vitest transforms test files as ESM,
// and a plain `import` of the same file yields a SEPARATE module instance
// with its own in-memory store (verified: SAME-STORE === false). Tests that
// seed or inspect the store the API actually reads MUST use this handle,
// otherwise rows written by the test are invisible to requests (404s that
// look like resolver bugs but are really a dual-module hazard).
// Production is unaffected (Supabase, not the demo store).
const requireCjs = createRequire(import.meta.url);

export function getAppDemoStore() {
  return requireCjs('../config/demoMode.js').getDemoStore();
}
