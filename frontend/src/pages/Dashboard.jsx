import { useState } from 'react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import DeviceCard from '../components/DeviceCard';
import AddDeviceModal from '../components/AddDeviceModal';
import { useDevices } from '../hooks/useDevices';

export default function Dashboard() {
  const { devices, loading, totalDevices, activeDevices, offlineDevices, addDevice } = useDevices();
  const [showModal, setShowModal] = useState(false);

  const handleAddDevice = async (data) => {
    await addDevice(data);
  };

  return (
    <>
      <Header
        rightAction={
          <button
            onClick={() => setShowModal(true)}
            className="min-touch md:hidden flex items-center justify-center text-primary"
            aria-label="Add device"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-0 pt-4 md:pt-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h2 className="text-[20px] md:text-2xl font-semibold text-gray-900">Overview</h2>
            <p className="text-[14px] text-gray-500 mt-0.5">Monitor your connected devices</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="hidden md:inline-flex items-center gap-2 h-11 px-5 bg-primary text-white text-[15px] font-medium rounded-xl hover:bg-blue-700 transition-colors tap-highlight"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Device
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8">
          <StatCard label="Connected Devices" value={totalDevices} color="text-primary" />
          <StatCard label="Active" value={activeDevices} color="text-success" bg="bg-green-50" />
          <StatCard label="Offline" value={offlineDevices} color="text-gray-500" bg="bg-gray-50" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] md:text-xl font-semibold text-gray-900">Your Devices</h2>
          <span className="text-[13px] text-gray-500">{devices.length} total</span>
        </div>

        {loading ? (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse" style={{ minHeight: 100 }}>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-[18px] font-medium text-gray-600">No devices yet</h3>
            <p className="text-[15px] text-gray-400 mt-1">Add your first tracker to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 h-11 px-6 bg-primary text-white text-[15px] font-medium rounded-xl md:hidden"
            >
              Add Device
            </button>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
            {devices.map((device) => (
              <DeviceCard key={device._id} device={device} />
            ))}
          </div>
        )}
      </div>

      <AddDeviceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddDevice}
      />
    </>
  );
}
