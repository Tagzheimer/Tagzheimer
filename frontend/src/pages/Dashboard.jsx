import { useState } from 'react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import DeviceCard from '../components/DeviceCard';
import AddDeviceModal from '../components/AddDeviceModal';
import { useDevices } from '../hooks/useDevices';

export default function Dashboard() {
  const { devices, allDevices, hiddenCount, loading, error, usingMockData, totalDevices, activeDevices, offlineDevices, addDevice, refresh } = useDevices();
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
            className="min-touch md:hidden flex items-center justify-center text-ink border border-hairline-2 h-9 px-3 hover:bg-surface-2 transition-colors"
            aria-label="Add device"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 md:pt-10 pb-24 md:pb-10">
        {(usingMockData || error) && (
          <div className="mb-6 border border-hairline-2 bg-surface px-4 py-3 text-[13px] text-ink-2 flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span><span className="text-ink font-semibold">OFFLINE — NO LIVE DATA.</span> Backend unreachable{error ? ` (${error})` : ''}. Check Settings → Backend or VITE_API_URL.</span>
          </div>
        )}
        <div className="flex items-end justify-between mb-8 md:mb-10">
          <div>
            <div className="label-mono mb-2">Overview</div>
            <h2 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">Devices</h2>
            <p className="text-[14px] text-ink-2 mt-2">Monitor your connected trackers</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="hidden md:inline-flex items-center gap-2 h-10 px-5 bg-white text-canvas text-[14px] font-semibold hover:bg-ink-2 transition-colors tap-highlight group"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Device
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-10">
          <StatCard label="Total" value={totalDevices} sub="Registered" />
          <StatCard label="Active" value={activeDevices} sub="Currently online" />
          <StatCard label="Offline" value={offlineDevices} sub="Needs attention" />
        </div>

        {/* Devices section header */}
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] md:text-base font-semibold text-ink">Your Devices</h3>
            <span className="label-mono">
              {devices.length} {devices.length === 1 ? 'item' : 'items'}
              {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
            </span>
          </div>
          {hiddenCount > 0 && (
            <span className="label-mono text-ink-3 border border-hairline-2 px-2 py-1">
              Filter on
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-hairline p-4 animate-pulse" style={{ minHeight: 110 }}>
                <div className="h-4 bg-surface-3 w-2/3 mb-3" />
                <div className="h-3 bg-surface-3 w-1/2 mb-4" />
                <div className="h-2 bg-surface-3 w-full mb-2" />
                <div className="h-2 bg-surface-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : devices.length === 0 ? (
          /* Empty state — distinguishes "no devices" from "all filtered out" */
          <div className="text-center py-20 md:py-24 border border-hairline bg-surface">
            <div className="w-16 h-16 border border-hairline-2 mx-auto mb-6 flex items-center justify-center relative">
              <svg className="w-7 h-7 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-hairline-3" />
              <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-hairline-3" />
              <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-hairline-3" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-hairline-3" />
            </div>
            {error ? (
              <>
                <div className="label-mono mb-2">Couldn&apos;t load devices</div>
                <p className="text-[15px] text-ink-2 mb-6 max-w-xs mx-auto">The backend didn&apos;t answer ({error}). Your trackers are still out there — retry once it&apos;s back.</p>
                <button
                  onClick={() => refresh()}
                  className="h-11 px-6 bg-white text-canvas text-[14px] font-semibold inline-flex items-center gap-2"
                >
                  Retry
                </button>
              </>
            ) : allDevices.length === 0 ? (
              <>
                <div className="label-mono mb-2">No devices registered</div>
                <p className="text-[15px] text-ink-2 mb-6 max-w-xs mx-auto">Add your first tracker to start monitoring patient locations.</p>
              </>
            ) : (
              <>
                <div className="label-mono mb-2">All devices filtered out</div>
                <p className="text-[15px] text-ink-2 mb-6 max-w-xs mx-auto">{allDevices.length} {allDevices.length === 1 ? 'device is' : 'devices are'} hidden by your list filter. Adjust it in Settings → Devices.</p>
              </>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="md:hidden h-11 px-6 bg-white text-canvas text-[14px] font-semibold inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Device
            </button>
          </div>
        ) : (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
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
