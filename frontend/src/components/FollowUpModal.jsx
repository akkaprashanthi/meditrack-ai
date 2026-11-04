import { useEffect, useRef, useState } from 'react';

export default function FollowUpModal({ appointment, isOpen, onClose, onSubmit }) {
  const [action, setAction] = useState('Phone Call');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setAction('Phone Call');
      setNotes('');
      setError('');
    }
  }, [isOpen, appointment?.id]);

  if (!isOpen || !appointment) return null;

  const submit = async () => {
    if (submitting.current) return;

    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ appointment_id: appointment.id, action, notes });
    } catch (submitError) {
      setError(submitError.message || 'Unable to save the follow-up. Please try again.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Follow-up action</p>
            <h3 className="text-xl font-semibold text-slate-900">{appointment.patient_name}</h3>
          </div>
          <button onClick={onClose} disabled={saving} className="text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">✕</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action taken</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} disabled={saving} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:opacity-60">
              <option>Phone Call</option>
              <option>SMS</option>
              <option>Email</option>
              <option>Rescheduled</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Appointment</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {new Date(appointment.appointment_date).toLocaleDateString()} · {appointment.department}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Staff notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} rows={5} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:opacity-60" placeholder="Add optional notes about the outcome..." />
        </div>

        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={saving} aria-busy={saving} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Saving...' : 'Confirm follow-up'}
          </button>
        </div>
      </div>
    </div>
  );
}
