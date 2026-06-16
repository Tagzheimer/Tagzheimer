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
    if (!form.name || !form.serialNumber || !form.patientName) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ name: '', serialNumber: '', patientName: '', notes: '' });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md sm:mx-4 px-5 pt-6 pb-8 animate-slide-up sm:animate-fade-in safe-bottom overscroll-contain"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-semibold text-gray-900">Add Device</h2>
          <button
            onClick={onClose}
            className="min-touch flex items-center justify-center text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-danger text-[15px] rounded-xl">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[15px] font-medium text-gray-700 mb-1.5">Device Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Patient Tracker #005"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-[16px] focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[15px] font-medium text-gray-700 mb-1.5">Serial Number *</label>
            <input
              type="text"
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              placeholder="e.g. TAG-005"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-[16px] focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[15px] font-medium text-gray-700 mb-1.5">Patient Name *</label>
            <input
              type="text"
              name="patientName"
              value={form.patientName}
              onChange={handleChange}
              placeholder="e.g. Alice Brown"
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-[16px] focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[15px] font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes about this device..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[16px] focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-primary text-white text-[16px] font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 tap-highlight"
          >
            {submitting ? 'Adding...' : 'Add Device'}
          </button>
        </form>
      </div>
    </div>
  );
}
