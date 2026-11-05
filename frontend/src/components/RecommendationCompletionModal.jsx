import { useEffect, useRef, useState } from 'react';

export default function RecommendationCompletionModal({ recommendation, isOpen, onClose, onSubmit }) {
  const [actionTaken, setActionTaken] = useState('Phone Call');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setActionTaken('Phone Call');
      setNotes('');
      setError('');
    }
  }, [isOpen, recommendation?.category]);

  if (!isOpen || !recommendation) return null;

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ category: recommendation.category, action_taken: actionTaken, notes });
    } catch (submitError) {
      setError(submitError.message || 'Unable to save this action. Please try again.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="recommendation-action-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="recommendation-action-title" className="text-xl font-semibold text-slate-900">Record recommendation action</h2>
        <p className="mt-1 text-sm text-slate-600">{recommendation.title}</p>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          Action taken
          <select value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} disabled={saving} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
            <option>Phone Call</option>
            <option>SMS</option>
            <option>Email</option>
            <option>Rescheduled</option>
            <option>Other</option>
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={saving} aria-busy={saving} className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? 'Saving...' : 'Mark completed'}
          </button>
        </div>
      </section>
    </div>
  );
}