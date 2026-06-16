import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password, remember);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh md:min-h-screen bg-background flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-white/20 rounded-[22px] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Tagzheimer</h1>
          <p className="text-lg text-blue-100">Patient Tracking & Safety Platform</p>
          <p className="text-base text-blue-200 mt-6 leading-relaxed">
            Helping caregivers keep Alzheimer&apos;s patients safe through real-time tracking, device management, and location monitoring.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 md:px-12 max-w-sm md:max-w-md mx-auto w-full py-8">
        <div className="md:hidden text-center mb-10">
          <div className="w-20 h-20 bg-primary rounded-[22px] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900">Tagzheimer</h1>
          <p className="text-[16px] text-gray-500 mt-1.5">Patient Tracking & Safety</p>
        </div>

        <div>
          <h2 className="text-[22px] md:text-2xl font-semibold text-gray-900 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 text-danger text-[15px] rounded-xl">{error}</div>
          )}
          {info && (
            <div className="mb-4 p-3.5 bg-blue-50 text-primary text-[15px] rounded-xl">{info}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl text-[16px] focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-12 px-4 border border-gray-300 rounded-xl text-[16px] focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer tap-highlight min-touch">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-[15px] text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setInfo('Password reset is not available in demo mode. Please contact support.')}
                className="text-[15px] text-primary font-medium tap-highlight min-touch"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white text-[16px] font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 tap-highlight shadow-lg shadow-primary/20 md:shadow-none"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-gray-400 mt-8">
          Tagzheimer &mdash; Keeping loved ones safe
        </p>
      </div>
    </div>
  );
}
