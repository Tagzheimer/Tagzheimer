/**
 * Reusable monochrome settings primitives.
 * Every control is keyboard-accessible, ≥44px touch targets, tabular nums.
 */

export function Section({ id, index, title, desc, children }) {
  return (
    <section id={id} aria-label={title} className="bg-surface border border-hairline mb-6 relative scroll-mt-20">
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-hairline-3" aria-hidden="true" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-hairline-3" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-hairline-3" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hairline-3" aria-hidden="true" />

      <div className="px-5 py-3 border-b border-hairline">
        <div className="label-mono mb-1">
          {index} · Settings
        </div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {desc && <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">{desc}</p>}
      </div>
      <div className="divide-y divide-hairline">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children, stacked = false }) {
  return (
    <div className={`px-5 py-4 flex ${stacked ? 'flex-col gap-3' : 'flex-col sm:flex-row sm:items-center gap-3'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {hint && <p className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            title={opt.title}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`min-touch min-w-[44px] px-3 h-11 text-[12px] font-mono font-bold uppercase tracking-wider border transition-colors tap-highlight ${
              active
                ? 'bg-white text-canvas border-white'
                : 'bg-canvas text-ink-2 border-hairline hover:text-ink hover:border-hairline-2'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="min-touch w-[52px] h-8 border border-hairline-2 bg-canvas relative transition-colors tap-highlight flex-shrink-0"
    >
      <span
        className={`absolute top-1 bottom-1 w-6 transition-all ${
          checked ? 'right-1 bg-white' : 'left-1 bg-ink-3'
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

export function Slider({ value, min, max, step = 1, onChange, format, ariaLabel }) {
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-11 cursor-pointer"
      />
      <span className="text-[14px] font-bold text-ink tabular-nums w-16 text-right flex-shrink-0">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

export function Note({ children }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[12px] text-ink-3 leading-relaxed border-l-2 border-hairline-2 pl-3">
        {children}
      </p>
    </div>
  );
}
