/**
 * Auth controller — uses Supabase Auth.
 *
 * The signup/login flows live in the frontend (which calls Supabase directly
 * via the JS SDK). The backend only needs to verify the JWT and fetch the
 * user's profile from the `profiles` table.
 *
 * Endpoints:
 *   POST /api/auth/verify     — verifies the Bearer JWT and returns the user
 */
const { getServiceClient, isSupabaseConfigured } = require('../config/supabase');
const { isDemoMode } = require('../config/demoMode');

const verifyToken = async (req, res) => {
  try {
    const { uid, email, name } = req.user;

    // In demo mode there's no profiles table — return what we know
    if (isDemoMode() || !isSupabaseConfigured()) {
      return res.json({
        success: true,
        user: {
          id: uid,
          name: name || 'Demo User',
          email: email || 'demo@tagzheimer.local',
        },
      });
    }

    const supabase = getServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.warn('[auth/verify] profile lookup failed:', error.message);
    }

    return res.json({
      success: true,
      user: {
        id: uid,
        name: profile?.name || name || email?.split('@')[0] || 'User',
        email: profile?.email || email,
        phone: profile?.phone,
      },
    });
  } catch (error) {
    console.error('Error in verifyToken:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { verifyToken };
