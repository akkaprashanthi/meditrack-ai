import { Bell, Search, Sparkles } from 'lucide-react';

export default function Header() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Operations overview</p>
          <h1 className="text-xl font-semibold text-slate-900">MediTrack AI</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search patient or ID"
            className="w-72 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-primary-500 focus:bg-white"
          />
        </div>
        <button className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500"></span>
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">SA</div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800">Samantha A.</p>
            <p className="text-xs text-slate-500">Clinic admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
