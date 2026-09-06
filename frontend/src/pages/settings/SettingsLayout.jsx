import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { subscribe } from '../../services/settings';
import { DOCS_URL, APP_VERSION } from '../../utils/constants';
import { SETTINGS_NAV } from './nav';

/**
 * Settings area shell — its own sidebar, the right way.
 *
 * Desktop: persistent sticky rail (numbers + labels + descriptions) with
 * real active states per sub-route. Mobile: swipeable chip row.
 * Each section is a sub-page (<Outlet />), so links are shareable and the
 * browser back button works between sections.
 */
function ChipNav() {
  return (
    <nav aria-label="Settings sections" className="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar overscroll-contain pb-2 mb-6">
      {SETTINGS_NAV.map((n) => (
        <NavLink
          key={n.id}
          to={n.path}
          className={({ isActive }) =>
            `flex-shrink-0 h-10 px-4 inline-flex items-center text-[12px] font-mono font-bold uppercase tracking-wider border transition-colors tap-highlight ${
              isActive
                ? 'bg-white text-canvas border-white'
                : 'text-ink-2 border-hairline hover:text-ink hover:border-hairline-2 hover:bg-surface-2'
            }`
          }
        >
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Rail() {
  return (
    <nav aria-label="Settings sections" className="hidden lg:block sticky top-24 border border-hairline bg-surface p-4">
      <div className="label-mono mb-3 px-2">Settings</div>
      <div className="flex flex-col gap-0.5">
        {SETTINGS_NAV.map((n, i) => (
          <NavLink
            key={n.id}
            to={n.path}
            className={({ isActive }) =>
              `px-2 py-2 border-l-2 transition-colors group ${
                isActive
                  ? 'text-ink bg-surface-2 border-white'
                  : 'text-ink-2 border-transparent hover:text-ink hover:bg-surface-2 hover:border-hairline-2'
              }`
            }
          >
            <span className="flex items-baseline gap-2">
              <span className="text-ink-4 text-[11px] font-mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[13px] font-mono font-medium">{n.label}</span>
            </span>
            <span className="block text-[11px] text-ink-3 mt-0.5 pl-7">{n.desc}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function SettingsLayout() {
  const { user } = useAuth();
  const [savedTick, setSavedTick] = useState(null);

  useEffect(() => subscribe(() => setSavedTick(Date.now())), []);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('');

  return (
    <>
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 md:pt-12 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto">
          {/* Identity — stacked on mobile, horizontal on desktop */}
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6 mb-8 md:mb-10 text-center md:text-left">
            <div className="w-20 h-20 border border-hairline-2 mx-auto md:mx-0 flex items-center justify-center relative flex-shrink-0">
              <span className="text-2xl font-bold text-ink">{initials}</span>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-white" />
              <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-white" />
              <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-white" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-white" />
            </div>
            <div className="min-w-0">
              <div className="label-mono mb-1">Caregiver · Settings</div>
              <h2 className="text-2xl font-bold text-ink tracking-tight truncate">{user?.name || 'User'}</h2>
              <p className="text-[14px] text-ink-3 mt-1 truncate">{user?.email || ''}</p>
              <p className="text-[11px] text-ink-3 mt-2 label-mono" role="status">
                {savedTick
                  ? `SAVED ${new Date(savedTick).toLocaleTimeString()} · CHANGES APPLY INSTANTLY`
                  : 'CHANGES SAVE AUTOMATICALLY · NO SAVE BUTTON'}
              </p>
            </div>
          </div>

          <ChipNav />

          <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 items-start">
            <Rail />
            <div className="min-w-0 max-w-3xl">
              <Outlet />
            </div>
          </div>

          <p className="text-center text-[11px] text-ink-3 mt-8 label-mono">
            Tagzheimer {APP_VERSION} · Patient Tracking System
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] label-mono mt-2">
            <Link to="/terms" className="text-ink-3 hover:text-ink transition-colors">
              Terms
            </Link>
            <span className="text-ink-4">·</span>
            <Link to="/privacy" className="text-ink-3 hover:text-ink transition-colors">
              Privacy
            </Link>
            <span className="text-ink-4">·</span>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-ink-3 hover:text-ink transition-colors">
              Docs ↗
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
