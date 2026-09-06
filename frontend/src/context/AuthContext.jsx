import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);

/**
 * Fetch a profile row. The PostgREST builder is thenable-but-not-a-Promise,
 * so `.catch()` is unavailable — use plain try/catch instead.
 */
async function fetchProfile(supabaseClient, userId) {
  if (!supabaseClient || !userId) return null;
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // === Bootstrap: restore session on mount ===
  useEffect(() => {
    let unsub;

    (async () => {
      if (!isSupabaseConfigured()) {
        // No Supabase configured — try to restore from either storage
        // (login with "remember me" uses localStorage, otherwise session).
        const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (stored && token) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
          }
        }
        setLoading(false);
        return;
      }

      try {
        // Get the current Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch the user's profile from the profiles table
          const profile = await fetchProfile(supabase, session.user.id);

          setUser({
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
            phone: profile?.phone,
            accessToken: session.access_token,
          });

          // Persist token for the axios interceptor to find
          localStorage.setItem('token', session.access_token);
        }
      } catch (err) {
        console.error('[Auth] bootstrap failed:', err);
      } finally {
        setLoading(false);
      }

      // Subscribe to auth changes (sign in / sign out / token refresh)
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const profile = await fetchProfile(supabase, session.user.id);

          setUser({
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
            phone: profile?.phone,
            accessToken: session.access_token,
          });
          localStorage.setItem('token', session.access_token);
        }
      });
      unsub = () => listener.subscription.unsubscribe();
    })();

    return () => unsub && unsub();
  }, []);

  // === Sign in (email + password) ===
  const login = async (email, password, remember) => {
    if (!isSupabaseConfigured()) {
      // Demo mode fallback — accept any creds, use mock-token for the API.
      // The id must match the backend mock-token uid (demo-user-uuid) and
      // the demo seed owner, otherwise the device list comes back empty.
      const demoUser = { id: 'demo-user-uuid', email, name: email?.split('@')[0] || 'Demo User' };
      setUser(demoUser);
      if (remember) {
        localStorage.setItem('user', JSON.stringify(demoUser));
        localStorage.setItem('token', 'mock-token');
      } else {
        sessionStorage.setItem('user', JSON.stringify(demoUser));
        sessionStorage.setItem('token', 'mock-token');
      }
      return demoUser;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const session = data.session;
    const profile = await fetchProfile(supabase, session.user.id);

    const u = {
      id: session.user.id,
      email: session.user.email,
      name: profile?.name || session.user.user_metadata?.name || email?.split('@')[0],
      phone: profile?.phone,
      accessToken: session.access_token,
    };
    setUser(u);
    // Token is auto-persisted by supabase-js; also mirror to localStorage
    // for the axios interceptor to find.
    if (remember) {
      localStorage.setItem('token', session.access_token);
    } else {
      sessionStorage.setItem('token', session.access_token);
    }
    return u;
  };

  // === Sign up (new user) ===
  const signup = async (email, password, name) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Sign-up requires Supabase. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  // === Sign out ===
  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
