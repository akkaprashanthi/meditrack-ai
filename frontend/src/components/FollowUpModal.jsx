import { useState } from 'react';

export default function FollowUpModal({ appointment, isOpen, onClose, onSubmit }) {
  const [action, setAction] = useState('Phone Call');
  const [notes, setNotes] = useState('');

  if (!isOpen || !appointment) return null;

  const submit = () => {
    onSubmit({ appointment_id: appointment.id, action, notes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Follow-up action</p>
            <h3 className="text-xl font-semibold text-slate-900">{appointment.patient_name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Action taken</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500">
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
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500" placeholder="Add optional notes about the outcome..." />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Confirm follow-up</button>
        </div>
      </div>
    </div>
  );
}
