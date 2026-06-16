import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDevices } from '../hooks/useDevices';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { totalDevices, activeDevices } = useDevices();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <Header />
      <div className="flex-1 overflow-y-auto px-4 md:px-0 pt-6 pb-24 md:pb-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
              <span className="text-3xl font-bold text-white">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <h2 className="text-[22px] font-semibold text-gray-900">{user?.name || 'User'}</h2>
            <p className="text-[15px] text-gray-500 mt-0.5">{user?.email || ''}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-6">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-[15px] text-gray-600">Total Devices</span>
              <span className="text-[17px] font-semibold text-gray-900">{totalDevices}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-[15px] text-gray-600">Active Devices</span>
              <span className="text-[17px] font-semibold text-success">{activeDevices}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-[15px] text-gray-600">Offline Devices</span>
              <span className="text-[17px] font-semibold text-gray-500">{totalDevices - activeDevices}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full h-12 bg-white text-danger text-[16px] font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors tap-highlight flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
