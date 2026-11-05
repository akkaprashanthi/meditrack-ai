import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import RecommendationPanel from '../components/RecommendationPanel';
import RecommendationCompletionModal from '../components/RecommendationCompletionModal';
import {
  getRecommendationPath,
  getSelectedNoShowAppointment,
  submitRecommendationCompletion,
} from '../services/recommendationWorkflow';

export default function RecommendationsPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/api/appointments', { params: { status: 'No-Show' } })
      .then((response) => {
        if (active) {
          setAppointments(response.data);
          if (response.data.length === 0) setLoading(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Unable to load no-show appointments.');
          setLoading(false);
        }
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (appointments === null) return;
    if (appointments.length === 0) {
      setRecommendations(null);
      setLoading(false);
      return;
    }

    const selected = getSelectedNoShowAppointment(appointments, appointmentId);
    if (String(selected.id) !== String(appointmentId)) {
      navigate(getRecommendationPath(selected.id), { replace: true });
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    api.get(`/api/recommendations/${selected.id}`)
      .then((response) => {
        if (active) setRecommendations(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load recommendations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [appointmentId, appointments, navigate]);

  const refreshRecommendations = async (id) => {
    const response = await api.get(`/api/recommendations/${id}`);
    setRecommendations(response.data);
  };

  const handleCompleteRecommendation = async ({ category, action_taken, notes }) => {
    const { completion, refreshSucceeded } = await submitRecommendationCompletion({
      submit: async () => {
        const response = await api.post(
          `/api/recommendations/${appointmentId}/completions`,
          { category, action_taken, notes },
        );
        return response.data;
      },
      refresh: () => refreshRecommendations(appointmentId),
    });
    setRecommendations((current) => ({
      ...current,
      recommendations: current.recommendations.map((item) => item.category === category
        ? {
          ...item,
          completion_status: completion.status,
          action_taken: completion.action_taken,
          completion_notes: completion.notes,
          completed_at: completion.completed_at,
        }
        : item),
    }));
    setSelectedRecommendation(null);
    setNotice(refreshSucceeded ? '' : 'Recommendation completion was saved, but its status could not be refreshed. Reload this page to verify.');
  };

  const retry = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/appointments', { params: { status: 'No-Show' } });
      setAppointments(response.data);
      const selected = getSelectedNoShowAppointment(response.data, appointmentId);
      if (!selected) {
        setRecommendations(null);
        return;
      }
      if (String(selected.id) !== String(appointmentId)) {
        navigate(getRecommendationPath(selected.id), { replace: true });
      }
      await refreshRecommendations(selected.id);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={retry} />;

  const selectedAppointment = appointments?.length ? getSelectedNoShowAppointment(appointments, appointmentId) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm text-slate-500">AI Recommendations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Deterministic, patient-specific outreach plan</h2>
        {appointments?.length ? (
          <label className="mt-4 block max-w-xl text-sm font-medium text-slate-700">
            No-show appointment
            <select
              value={appointmentId || ''}
              onChange={(event) => navigate(getRecommendationPath(event.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  #{appointment.id} · {appointment.patient_name} · {appointment.department}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {notice ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{notice}</p> : null}
      {!appointments?.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">There are no no-show appointments to review.</div>
      ) : (
        <>
          {selectedAppointment ? <p className="text-sm text-slate-600">Recommendations for {selectedAppointment.patient_name} (appointment #{selectedAppointment.id})</p> : null}
          <RecommendationPanel recommendations={recommendations} onRecordAction={setSelectedRecommendation} />
        </>
      )}

      <RecommendationCompletionModal
        recommendation={selectedRecommendation}
        isOpen={Boolean(selectedRecommendation)}
        onClose={() => setSelectedRecommendation(null)}
        onSubmit={handleCompleteRecommendation}
      />
    </div>
  );
}
