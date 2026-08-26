export default function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface border border-hairline p-4 md:p-5 flex flex-col gap-2 md:gap-3 relative group hover:border-hairline-2 transition-colors">
      {/* Corner tick marks */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-hairline-3" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-hairline-3" />

      <div className="label-mono">{label}</div>
      <div className="text-3xl md:text-4xl font-bold text-ink tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </div>
      {sub && <div className="text-[11px] text-ink-3 leading-tight">{sub}</div>}
    </div>
  );
}
