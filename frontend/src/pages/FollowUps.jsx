import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

const EMPTY_FILTERS = {
  patient_search: '',
  appointment_id: '',
  action: '',
  status: '',
  start_date: '',
  end_date: '',
};

const FOLLOW_UP_ACTIONS = ['Phone Call', 'SMS', 'Email', 'Rescheduled', 'Other'];
const EMPTY_COMPLETION_FILTERS = {
  patient_search: '',
  appointment_id: '',
  category: '',
  action: '',
  start_date: '',
  end_date: '',
};

export default function FollowUpsPage() {
  const [items, setItems] = useState([]);
  const [recommendationCompletions, setRecommendationCompletions] = useState([]);
  const [completionCategories, setCompletionCategories] = useState([]);
  const [completionActions, setCompletionActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(true);
  const [completionRefreshing, setCompletionRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [completionError, setCompletionError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [completionFilters, setCompletionFilters] = useState(EMPTY_COMPLETION_FILTERS);
  const requestId = useRef(0);
  const completionRequestId = useRef(0);

  const fetchFollowUps = async (activeFilters = filters) => {
    const currentRequestId = ++requestId.current;
    try {
      setError('');
      if (items.length === 0 && loading) setLoading(true);
      else setRefreshing(true);
      const params = Object.fromEntries(
        Object.entries(activeFilters).filter(([, value]) => value !== ''),
      );
      const followUpsResponse = await api.get('/api/followups', { params });
      if (currentRequestId !== requestId.current) return;
      setItems(followUpsResponse.data);
    } catch (err) {
      if (currentRequestId === requestId.current) setError(err.message || 'Unable to load follow-up log.');
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const fetchRecommendationCompletions = async (activeFilters = completionFilters) => {
    const currentRequestId = ++completionRequestId.current;
    try {
      setCompletionError('');
      if (completionLoading) setCompletionLoading(true);
      else setCompletionRefreshing(true);
      const params = Object.fromEntries(
        Object.entries(activeFilters).filter(([, value]) => value !== ''),
      );
      const response = await api.get('/api/recommendation-completions', { params });
      if (currentRequestId !== completionRequestId.current) return;
      setRecommendationCompletions(response.data);
      if (Object.keys(params).length === 0) {
        setCompletionCategories([...new Set(response.data.map((item) => item.category).filter(Boolean))].sort());
        setCompletionActions([...new Set(response.data.map((item) => item.action_taken).filter(Boolean))].sort());
      }
    } catch (requestError) {
      if (currentRequestId === completionRequestId.current) {
        setCompletionError(requestError.message || 'Unable to load completed recommendations.');
      }
    } finally {
      if (currentRequestId === completionRequestId.current) {
        setCompletionLoading(false);
        setCompletionRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchFollowUps(filters);
    return () => { requestId.current += 1; };
  }, [filters]);

  useEffect(() => {
    fetchRecommendationCompletions(completionFilters);
    return () => { completionRequestId.current += 1; };
  }, [completionFilters]);

  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  const clearFilters = () => setFilters({ ...EMPTY_FILTERS });
  const setCompletionFilter = (name, value) => setCompletionFilters((current) => ({ ...current, [name]: value }));
  const clearCompletionFilters = () => setCompletionFilters({ ...EMPTY_COMPLETION_FILTERS });
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const statuses = [...new Set(['Completed', ...items.map((item) => item.status).filter(Boolean)])].sort();
  const hasActiveCompletionFilters = Object.values(completionFilters).some(Boolean);

  if (loading || completionLoading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={() => fetchFollowUps(filters)} />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Follow-up tracking</p>
            <h2 className="text-2xl font-semibold text-slate-900">Clinical outreach log</h2>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Search patient ID or name
            <input
              value={filters.patient_search}
              onChange={(event) => setFilter('patient_search', event.target.value)}
              placeholder="e.g. PT-0121 or patient name"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Appointment ID
            <input
              type="number"
              min="1"
              value={filters.appointment_id}
              onChange={(event) => setFilter('appointment_id', event.target.value)}
              placeholder="Appointment ID"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Action
            <select value={filters.action} onChange={(event) => setFilter('action', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">All actions</option>
              {FOLLOW_UP_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Status
            <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            From date
            <input type="date" value={filters.start_date} onChange={(event) => setFilter('start_date', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            To date
            <input type="date" min={filters.start_date || undefined} value={filters.end_date} onChange={(event) => setFilter('end_date', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-600">
            {refreshing ? 'Updating records… ' : ''}
            {items.length} matching records · {items.length} displayed
          </p>
          <button type="button" onClick={clearFilters} disabled={!hasActiveFilters} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Clear Filters
          </button>
        </div>

        <div className="overflow-x-auto" aria-busy={refreshing}>
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
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    {hasActiveFilters ? 'No follow-up records match these filters. Try changing or clearing the filters.' : 'No follow-up activity logged yet.'}
                  </td>
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
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <div className="mb-5">
          <p className="text-sm font-medium text-emerald-700">AI recommendation actions</p>
          <h2 className="text-xl font-semibold text-slate-900">Completed recommendations</h2>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Search completed patient ID or name
            <input
              value={completionFilters.patient_search}
              onChange={(event) => setCompletionFilter('patient_search', event.target.value)}
              placeholder="Patient ID or name"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Completed appointment ID
            <input
              type="number"
              min="1"
              value={completionFilters.appointment_id}
              onChange={(event) => setCompletionFilter('appointment_id', event.target.value)}
              placeholder="Appointment ID"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Recommendation category
            <select value={completionFilters.category} onChange={(event) => setCompletionFilter('category', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">All categories</option>
              {completionCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Action taken
            <select value={completionFilters.action} onChange={(event) => setCompletionFilter('action', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">All actions</option>
              {completionActions.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Completed from date
            <input type="date" value={completionFilters.start_date} onChange={(event) => setCompletionFilter('start_date', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Completed to date
            <input type="date" min={completionFilters.start_date || undefined} value={completionFilters.end_date} onChange={(event) => setCompletionFilter('end_date', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-slate-600">
            {completionRefreshing ? 'Updating records… ' : ''}
            {recommendationCompletions.length} matching records
          </p>
          <button type="button" onClick={clearCompletionFilters} disabled={!hasActiveCompletionFilters} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
            Clear Filters
          </button>
        </div>
        {completionError ? (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{completionError}</span>
            <button type="button" onClick={() => fetchRecommendationCompletions(completionFilters)} className="font-medium underline">Retry</button>
          </div>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-emerald-100 bg-white">
          <table aria-busy={completionRefreshing} className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-emerald-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Recommendation category</th>
                <th className="px-4 py-3">Action taken</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Completion date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {recommendationCompletions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">{hasActiveCompletionFilters ? 'No completed recommendations match these filters. Try changing or clearing the filters.' : 'No AI recommendations completed yet.'}</td></tr>
              ) : recommendationCompletions.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">#{item.appointment_id}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.action_taken}</td>
                  <td className="px-4 py-3 max-w-xs">{item.notes || '—'}</td>
                  <td className="px-4 py-3">{new Date(item.completed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
