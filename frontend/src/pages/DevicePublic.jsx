import { useParams, useNavigate } from 'react-router-dom';
import { mockDevices } from '../services/mockData';
import { MOCK_USER } from '../utils/constants';

export default function DevicePublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const device = mockDevices.find((d) => d._id === id);

  if (!device) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-center px-5 max-w-sm mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-semibold text-gray-600">Device not found</h2>
          <p className="text-[15px] text-gray-400 mt-1">This QR code may be invalid or the device has been removed.</p>
        </div>
      </div>
    );
  }

  const timeAgo = device.lastSeen
    ? `${Math.floor((Date.now() - new Date(device.lastSeen).getTime()) / 60000)}m ago`
    : 'Unknown';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-primary/5 to-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h1 className="text-[22px] font-semibold text-gray-900 mb-1">{device.patientName}</h1>
            <p className="text-[15px] text-gray-500">{device.name}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <h2 className="text-[17px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              Contact Caregiver
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[15px] font-semibold text-primary">
                    {MOCK_USER.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-gray-900">{MOCK_USER.name}</p>
                  <p className="text-[13px] text-gray-500">Caregiver</p>
                </div>
              </div>
              <a
                href={`tel:${MOCK_USER.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 h-12 px-4 bg-primary/5 text-primary rounded-xl text-[15px] font-medium tap-highlight hover:bg-primary/10 transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>{MOCK_USER.phone}</span>
              </a>
              <a
                href={`mailto:${MOCK_USER.email}`}
                className="flex items-center gap-3 h-12 px-4 bg-gray-50 text-gray-700 rounded-xl text-[15px] font-medium tap-highlight hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>{MOCK_USER.email}</span>
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-[17px] font-semibold text-gray-900 mb-3">Device Info</h2>
            <div className="space-y-2 text-[15px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Serial</span>
                <span className="font-medium text-gray-900">{device.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium ${device.status === 'online' ? 'text-success' : 'text-gray-500'}`}>
                  {device.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Battery</span>
                <span className="font-medium text-gray-900">{device.battery}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last seen</span>
                <span className="text-gray-600">{timeAgo}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 flex-shrink-0">
        <button
          onClick={() => navigate('/login')}
          className="w-full h-12 bg-primary text-white text-[16px] font-medium rounded-xl hover:bg-blue-700 transition-colors tap-highlight"
        >
          Caregiver Sign In
        </button>
        <p className="text-center text-[12px] text-gray-400 mt-3">
          Tagzheimer Patient Tracker &mdash; Keeping loved ones safe
        </p>
      </div>
    </div>
  );
}
