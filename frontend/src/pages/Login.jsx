import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('signin');  // 'signin' | 'signup'
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup' && supabaseReady) {
        await signup(email, password, email.split('@')[0]);
        setInfo('Account created! Check your email for a confirmation link, then sign in.');
        setMode('signin');
      } else {
        await login(email, password, remember);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || (mode === 'signup' ? 'Sign-up failed' : 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh md:min-h-screen bg-canvas flex flex-col md:flex-row">
      {/* Left panel — branding */}
      <div className="hidden md:flex md:w-1/2 bg-surface border-r border-hairline items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Decorative corner brackets */}
        <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-ink-3" />
        <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-ink-3" />
        <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-ink-3" />
        <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-ink-3" />

        <div className="relative text-center max-w-md">
          <div className="w-16 h-16 border border-hairline-2 flex items-center justify-center mx-auto mb-8 relative">
            <svg className="w-8 h-8 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-white" />
            <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-white" />
            <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-white" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-white" />
          </div>
          <div className="label-mono mb-3">Patient Tracking System</div>
          <h1 className="text-5xl font-bold text-ink mb-4 tracking-tight">Tagzheimer</h1>
          <div className="w-12 h-px bg-hairline-2 mx-auto mb-6" />
          <p className="text-base text-ink-2 leading-relaxed max-w-sm">
            Real-time location monitoring for Alzheimer's patients. Built for caregivers who need to know their loved ones are safe — every minute, every day.
          </p>

          {/* Telemetry-style footer */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-[11px] text-ink-3 label-mono pt-8">
            <span>v1.0.0</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-soft" />
              SYSTEM ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-5 md:px-12 max-w-sm md:max-w-md mx-auto w-full py-8">
        {/* Mobile-only header */}
        <div className="md:hidden text-center mb-10">
          <div className="w-14 h-14 border border-hairline-2 flex items-center justify-center mx-auto mb-4 relative">
            <svg className="w-7 h-7 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-white" />
            <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-white" />
            <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-white" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Tagzheimer</h1>
          <p className="text-[11px] text-ink-3 mt-1 label-mono">Patient Tracking System</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-semibold text-ink">
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </h2>
            <span className="label-mono">01 / 01</span>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-surface border border-hairline-2 text-ink text-[14px] flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="mb-4 p-3.5 bg-surface border border-hairline-2 text-ink-2 text-[14px] flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block label-mono mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 bg-surface border border-hairline text-ink text-[15px] focus:border-white transition-colors outline-none placeholder:text-ink-4"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label className="block label-mono mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full h-12 px-4 bg-surface border border-hairline text-ink text-[15px] focus:border-white transition-colors outline-none placeholder:text-ink-4"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer tap-highlight min-touch">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 border border-hairline-2 bg-surface accent-white"
                />
                <span className="text-[13px] text-ink-2">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setInfo('Password reset is not available in demo mode. Please contact support.')}
                className="text-[13px] text-ink font-medium tap-highlight min-touch hover:underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-white text-canvas text-[15px] font-semibold hover:bg-ink-2 hover:text-canvas transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-canvas tap-highlight flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border border-canvas/30 border-t-canvas rounded-full animate-spin" />
                  {mode === 'signup' ? 'Creating account' : 'Signing in'}
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Toggle between sign-in / sign-up */}
            {!supabaseReady && mode === 'signup' ? (
              <p className="text-center text-[12px] text-ink-3 pt-1">
                Sign-up requires Supabase. Set <code className="text-ink font-mono">VITE_SUPABASE_URL</code> + <code className="text-ink font-mono">VITE_SUPABASE_ANON_KEY</code>.
              </p>
            ) : (
              <p className="text-center text-[13px] text-ink-3 pt-1">
                {mode === 'signin' ? (
                  <>
                    No account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
                      className="text-ink font-medium hover:underline underline-offset-4"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signin'); setError(''); setInfo(''); }}
                      className="text-ink font-medium hover:underline underline-offset-4"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </form>
        </div>

        <div className="mt-10 pt-6 border-t border-hairline">
          <p className="text-center text-[11px] text-ink-3 label-mono">
            Tagzheimer · Keeping loved ones safe
          </p>
        </div>
      </div>
    </div>
  );
}
