import { useEffect, useState } from 'react';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function FollowUpsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/followups');
      setItems(response.data);
    } catch (err) {
      setError(err.message || 'Unable to load follow-up log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={fetchFollowUps} />;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Follow-up tracking</p>
          <h2 className="text-2xl font-semibold text-slate-900">Clinical outreach log</h2>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Appointment</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Follow-up date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No follow-up activity logged yet.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.patient_id}</td>
                  <td className="px-4 py-3">#{item.appointment_id}</td>
                  <td className="px-4 py-3">{item.action}</td>
                  <td className="px-4 py-3 max-w-xs">{item.notes || '—'}</td>
                  <td className="px-4 py-3">{new Date(item.follow_up_date).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">{item.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
