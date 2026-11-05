import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import AppointmentTable from '../components/AppointmentTable';
import AppointmentDetails from '../components/AppointmentDetails';
import FollowUpModal from '../components/FollowUpModal';
import { getFollowUpResultMessage, submitFollowUpAndRefresh } from '../services/followUpSubmission';
import { getRecommendationPath } from '../services/recommendationWorkflow';

const statusOptions = ['All', 'Scheduled', 'Completed', 'No-Show', 'Cancelled'];

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({ status: 'All', department: 'All', date: '', search: '' });
  const [sortConfig, setSortConfig] = useState({ sort_by: 'appointment_date', sort_desc: false });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modalAppointment, setModalAppointment] = useState(null);
  const [followUpNotice, setFollowUpNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAppointments = async ({ showLoading = true, showError = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const params = {};
      if (filters.status && filters.status !== 'All') params.status = filters.status;
      if (filters.department && filters.department !== 'All') params.department = filters.department;
      if (filters.date) params.date = filters.date;
      params.sort_by = sortConfig.sort_by;
      params.sort_desc = sortConfig.sort_desc;
      const response = await api.get('/api/appointments', { params });
      setAppointments(response.data);
      return true;
    } catch (err) {
      if (showError) setError(err.message || 'Unable to load appointments. Please try again.');
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filters.status, filters.department, filters.date, sortConfig.sort_by, sortConfig.sort_desc]);

  const departments = useMemo(() => [...new Set(appointments.map((item) => item.department))], [appointments]);

  const visibleAppointments = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    const filtered = appointments.filter((item) => {
      const patientName = (item.patient_name || '').toLowerCase();
      const patientId = (item.patient_id || '').toLowerCase();
      const matchesSearch = !searchValue || patientName.includes(searchValue) || patientId.includes(searchValue);
      return matchesSearch;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const getComparableValue = (item) => {
        switch (sortConfig.sort_by) {
          case 'patient_name':
            return (item.patient_name || '').toLowerCase();
          case 'status':
            return (item.status || '').toLowerCase();
          case 'appointment_date':
            return new Date(item.appointment_date || 0).getTime();
          default:
            return '';
        }
      };

      const left = getComparableValue(a);
      const right = getComparableValue(b);

      if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
      }

      return String(left).localeCompare(String(right));
    });

    if (sortConfig.sort_desc) {
      sorted.reverse();
    }

    return sorted;
  }, [appointments, filters.search, sortConfig]);

  const handleGenerateRecommendation = (id) => navigate(getRecommendationPath(id));

  const handleFollowUpSubmit = async (payload) => {
    setFollowUpNotice('');
    const result = await submitFollowUpAndRefresh({
      submit: () => api.post('/api/followups', payload),
      refresh: () => fetchAppointments({ showLoading: false, showError: false }),
    });
    setModalAppointment(null);
    setFollowUpNotice(getFollowUpResultMessage(result.refreshSucceeded));
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={fetchAppointments} />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm text-slate-500">Appointments</p>
            <h2 className="text-2xl font-semibold text-slate-900">Patient schedule management</h2>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <input value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search patient or ID" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500">
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={filters.department} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500">
              <option value="All">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <input type="date" value={filters.date} onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500" />
            <select value={sortConfig.sort_by} onChange={(e) => setSortConfig((prev) => ({ ...prev, sort_by: e.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500" aria-label="Sort appointments by">
              <option value="appointment_date">Sort: Date</option>
              <option value="patient_name">Sort: Patient</option>
              <option value="status">Sort: Status</option>
            </select>
            <select value={sortConfig.sort_desc ? 'desc' : 'asc'} onChange={(e) => setSortConfig((prev) => ({ ...prev, sort_desc: e.target.value === 'desc' }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500" aria-label="Sort direction">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      {followUpNotice ? (
        <p role="status" className={`rounded-lg border p-3 text-sm ${followUpNotice.startsWith('Follow-up saved successfully, but') ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
          {followUpNotice}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_0.8fr]">
        <AppointmentTable
          appointments={visibleAppointments}
          onSelect={setSelectedAppointment}
          onGenerateRecommendation={handleGenerateRecommendation}
          onFollowUp={(appointment) => {
            setFollowUpNotice('');
            setModalAppointment(appointment);
          }}
        />
        <AppointmentDetails appointment={selectedAppointment} />
      </div>

      <FollowUpModal appointment={modalAppointment} isOpen={Boolean(modalAppointment)} onClose={() => setModalAppointment(null)} onSubmit={handleFollowUpSubmit} />
    </div>
  );
}
