import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AppointmentsPage from './pages/Appointments';
import RecommendationsPage from './pages/Recommendations';
import FollowUpsPage from './pages/FollowUps';
import AnalyticsPage from './pages/Analytics';

export default function App() {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/followups" element={<FollowUpsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
