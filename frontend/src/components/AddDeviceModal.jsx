import { useState, useEffect } from 'react';

export default function AddDeviceModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', serialNumber: '', patientName: '', notes: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      if (error) setError('');
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const serialNumber = form.serialNumber.trim();
    const patientName = form.patientName.trim();
    if (!name || !serialNumber || !patientName) {
      setError('Please fill in all required fields (whitespace only is not enough)');
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*[A-Za-z0-9]$/.test(serialNumber) || serialNumber.length < 3 || serialNumber.length > 64) {
      setError('Serial must be 3-64 chars: letters, numbers, dashes, underscores');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ name, serialNumber, patientName, notes: form.notes.trim() });
      setForm({ name: '', serialNumber: '', patientName: '', notes: '' });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-canvas/80 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-surface border border-hairline-2 w-full sm:max-w-md sm:mx-4 animate-slide-up sm:animate-fade-in safe-bottom overscroll-contain"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <div>
            <div className="label-mono mb-0.5">New Registration</div>
            <h2 className="text-lg font-semibold text-ink">Add Device</h2>
          </div>
          <button
            onClick={onClose}
            className="min-touch flex items-center justify-center text-ink-3 hover:text-ink border border-hairline-2 w-9 h-9 hover:bg-surface-2 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {error && (
            <div className="mb-4 p-3 bg-surface-2 border border-hairline-2 text-ink text-[13px] flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block label-mono mb-2">Device Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Patient Tracker #005"
                className="w-full h-11 px-3 bg-canvas border border-hairline text-ink text-[15px] focus:border-white transition-colors outline-none placeholder:text-ink-4"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block label-mono mb-2">Serial Number *</label>
              <input
                type="text"
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
                placeholder="TAG-005"
                className="w-full h-11 px-3 bg-canvas border border-hairline text-ink text-[15px] focus:border-white transition-colors outline-none placeholder:text-ink-4"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block label-mono mb-2">Patient Name *</label>
              <input
                type="text"
                name="patientName"
                value={form.patientName}
                onChange={handleChange}
                placeholder="Alice Brown"
                className="w-full h-11 px-3 bg-canvas border border-hairline text-ink text-[15px] focus:border-white transition-colors outline-none placeholder:text-ink-4"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block label-mono mb-2">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Optional notes about this device..."
                className="w-full px-3 py-3 bg-canvas border border-hairline text-ink text-[15px] focus:border-white transition-colors outline-none resize-none placeholder:text-ink-4"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 bg-transparent border border-hairline-2 text-ink-2 text-[14px] font-medium hover:bg-surface-2 hover:text-ink transition-colors tap-highlight"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 bg-white text-canvas text-[14px] font-semibold hover:bg-ink-2 transition-colors disabled:opacity-40 tap-highlight flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border border-canvas/30 border-t-canvas rounded-full animate-spin" />
                    Saving
                  </>
                ) : (
                  'Add Device'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
