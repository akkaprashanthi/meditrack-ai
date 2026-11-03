import { useEffect, useState } from 'react';
import api from '../services/api';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import RecommendationPanel from '../components/RecommendationPanel';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFirstNoShow = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/appointments', { params: { status: 'No-Show' } });
      const firstNoShow = response.data[0];
      if (!firstNoShow) {
        setRecommendations(null);
        return;
      }
      const recResponse = await api.get(`/api/recommendations/${firstNoShow.id}`);
      setRecommendations(recResponse.data);
    } catch (err) {
      setError(err.message || 'Unable to generate AI recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirstNoShow();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} retry={fetchFirstNoShow} />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm text-slate-500">AI Recommendations</p>
        <h2 className="text-2xl font-semibold text-slate-900">Deterministic, patient-specific outreach plan</h2>
      </div>
      <RecommendationPanel recommendations={recommendations} />
    </div>
  );
}
