import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for the browser.
 * -------------------------------
 * Uses the ANON key only — safe to expose because Row Level Security
 * protects all tables. Never put the service_role key here.
 *
 * Leave VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY empty to run in demo
 * mode (mock-token auth + no cloud sync).
 */

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = () => Boolean(url && anonKey);

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
