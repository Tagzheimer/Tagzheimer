/**
 * Models — v3.0
 * -----------------
 * With Supabase, we no longer have Mongoose model classes. The Supabase
 * client (`@supabase/supabase-js`) is the data layer, accessed via
 * `config/supabase.js`.
 *
 * In demo mode (DEMO_MODE=true), we still use the in-memory store from
 * `config/demoMode.js` — no Supabase connection required.
 *
 * For backwards compatibility with any code that does `require('../models')`,
 * we expose the demo store in demo mode, or a stub otherwise.
 */
const { isDemoMode, getDemoStore } = require('../config/demoMode');

if (isDemoMode()) {
  module.exports = getDemoStore();
} else {
  module.exports = {
    _deprecated: 'Use config/supabase.js directly via getServiceClient()',
  };
}
