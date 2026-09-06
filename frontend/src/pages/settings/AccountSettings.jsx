import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDevices } from '../../hooks/useDevices';
import { Section, Row } from '../../components/settings/SettingsControls';

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { totalDevices, activeDevices } = useDevices();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Section index="01" title="Account" desc="Who is signed in on this browser.">
      <Row label="Email" hint={user?.uid ? `User ID · ${user.uid}` : 'User ID unavailable'}>
        <span className="text-[13px] text-ink font-medium">{user?.email || '—'}</span>
      </Row>
      <Row label="Devices" hint={`${activeDevices} online right now`}>
        <span className="text-lg font-bold text-ink tabular-nums">{String(totalDevices).padStart(2, '0')}</span>
      </Row>
      <div className="px-5 py-4">
        <button
          onClick={handleLogout}
          className="w-full h-12 bg-surface border border-hairline-2 text-ink text-[14px] font-semibold hover:bg-surface-2 hover:border-hairline-3 transition-colors tap-highlight flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Logout
        </button>
      </div>
    </Section>
  );
}
