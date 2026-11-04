import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck2, ClipboardList, UserRoundX } from 'lucide-react';
import api from '../services/api';
import StatCard from '../components/StatCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [recentNoShows, setRecentNoShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, trendsRes, departmentRes, noShowRes] = await Promise.all([
        api.get('/api/appointments/stats'),
        api.get('/api/analytics/weekly-trends'),
        api.get('/api/analytics/department-stats'),
        api.get('/api/appointments', { params: { status: 'No-Show' } }),
      ]);

      setStats(statsRes.data);
      setWeeklyTrends(trendsRes.data);
      setDepartmentStats(departmentRes.data);
      setRecentNoShows(noShowRes.data.slice(0, 5));
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={fetchDashboard} />;
  if (!stats) return null;

  const optionTones = [
    'bg-blue-50 text-blue-700',
    'bg-red-50 text-red-700',
    'bg-green-50 text-green-700',
    'bg-amber-50 text-amber-700',
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total appointments" value={stats.total_appointments} detail="All" tone="blue" />
        <StatCard title="Completed" value={stats.completed_appointments} detail="Done" tone="green" />
        <StatCard title="No-shows" value={stats.no_show_appointments} detail="Missed" tone="red" />
        <StatCard title="Pending follow-ups" value={stats.pending_followups} detail="Agent" tone="orange" />
        <StatCard title="No-show rate" value={`${stats.no_show_rate}%`} detail="Today" tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Appointment overview</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">Live</span>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total today</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.appointments_today}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm text-green-700">Completed</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.completed_appointments}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm text-red-700">Missed</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.no_show_appointments}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-sm text-amber-700">Upcoming</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats.upcoming_appointments}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">AI insights</h3>
          <div className="space-y-3 text-sm text-slate-600">
            {departmentStats.slice(0, 3).map((item, index) => (
              <div key={item.department} className={`flex items-center justify-between rounded-xl p-3 ${optionTones[index % optionTones.length]}`}>
                <div>
                  <p className="font-medium">{item.department}</p>
                  <p>{item.no_shows} no-shows</p>
                </div>
                <p className="font-semibold">{item.no_show_rate}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnalyticsCharts trends={weeklyTrends} departmentStats={departmentStats} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent no-show appointments</h3>
          <div className="space-y-3">
            {recentNoShows.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">There are no recent no-show appointments.</p>
            ) : recentNoShows.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-800">{item.patient_name}</p>
                  <p className="text-sm text-slate-500">{new Date(item.appointment_date).toLocaleDateString()} • {item.department}</p>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Operational notes</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex gap-3 rounded-xl bg-blue-50 p-3 text-blue-700">
              <CalendarCheck2 size={18} />
              <p>Staff should prioritize outreach for high-risk follow-up appointments after 4 PM.</p>
            </div>
            <div className="flex gap-3 rounded-xl bg-red-50 p-3 text-red-700">
              <AlertTriangle size={18} />
              <p>Cardiology and orthopedics departments have the highest no-show concentration this week.</p>
            </div>
            <div className="flex gap-3 rounded-xl bg-green-50 p-3 text-green-700">
              <ClipboardList size={18} />
              <p>Follow-up reminders improved completion by 18% in the last seven days.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
