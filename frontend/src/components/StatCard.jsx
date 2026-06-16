export default function StatCard({ label, value, color = 'text-gray-900', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100 flex items-center gap-4 min-h-[64px]">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-lg font-bold ${color}`}>{value}</span>
      </div>
      <div>
        <p className="text-[15px] font-medium text-gray-900">{label}</p>
        <p className={`text-[13px] ${color}`}>
          {label === 'Connected Devices' ? 'Total registered' : label === 'Active' ? 'Currently online' : 'Currently offline'}
        </p>
      </div>
    </div>
  );
}
