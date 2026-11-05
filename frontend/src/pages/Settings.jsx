import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import packageMetadata from '../../package.json';
import api from '../services/api';

export default function SettingsPage() {
  const [connection, setConnection] = useState('checking');
  const [connectionError, setConnectionError] = useState('');

  const checkConnection = async () => {
    setConnection('checking');
    setConnectionError('');
    try {
      const response = await api.get('/health');
      setConnection(response.data?.status === 'ok' ? 'connected' : 'unavailable');
    } catch (error) {
      setConnection('unavailable');
      setConnectionError(error.message || 'The backend could not be reached.');
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const connectionLabel = {
    checking: 'Checking connection…',
    connected: 'Connected',
    unavailable: 'Unavailable',
  }[connection];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">Configuration</p>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Current application information and connection status.</p>
      </header>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Settings shown here are informational only. Clinic details and preferences are not currently saved by the application.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Clinic information</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Clinic name</dt><dd className="text-right text-slate-800">Not configured</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Contact details</dt><dd className="text-right text-slate-800">Not configured</dd></div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Application preferences</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Default page</dt><dd className="text-right text-slate-800">Dashboard</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Date and time format</dt><dd className="text-right text-slate-800">Browser locale</dd></div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Notification preferences</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">No notification channels are configured. The application does not currently send email or SMS notifications.</p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">System information</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Application version</dt><dd className="text-right text-slate-800">{packageMetadata.version}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-500">Backend API</dt>
              <dd className="flex items-center gap-2 text-right text-slate-800">
                <span role="status" className={connection === 'connected' ? 'text-green-700' : connection === 'unavailable' ? 'text-red-700' : 'text-slate-500'}>{connectionLabel}</span>
                <button type="button" onClick={checkConnection} disabled={connection === 'checking'} aria-label="Check backend connection" title="Check backend connection" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                  <RefreshCw size={15} className={connection === 'checking' ? 'animate-spin' : ''} />
                </button>
              </dd>
            </div>
          </dl>
          {connectionError ? <p className="mt-2 text-sm text-red-700">{connectionError}</p> : null}
        </section>
      </div>
    </div>
  );
}
