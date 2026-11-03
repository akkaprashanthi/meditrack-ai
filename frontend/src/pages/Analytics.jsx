import { useEffect, useState } from 'react';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function AnalyticsPage() {
  const [trends, setTrends] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const [weeklyRes, departmentRes] = await Promise.all([
        api.get('/api/analytics/weekly-trends'),
        api.get('/api/analytics/department-stats'),
      ]);
      setTrends(weeklyRes.data);
      setDepartmentStats(departmentRes.data);
    } catch (err) {
      setError(err.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={fetchAnalytics} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Avg. no-show rate</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">
            {departmentStats.length ? `${(departmentStats.reduce((total, item) => total + item.no_show_rate, 0) / departmentStats.length).toFixed(1)}%` : '0%'}
          </h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">High-risk department</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{departmentStats.reduce((max, item) => (item.no_show_rate > max.no_show_rate ? item : max), { department: '—', no_show_rate: 0 }).department}</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Peak missed day</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{trends.reduce((max, item) => (item.no_show_count > max.no_show_count ? item : max), { date: '—', no_show_count: 0 }).date}</h3>
        </div>
      </div>

      <AnalyticsCharts trends={trends} departmentStats={departmentStats} />
    </div>
  );
}
