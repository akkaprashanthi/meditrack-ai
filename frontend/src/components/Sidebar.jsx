import { Activity, CalendarDays, ChartColumnBig, House, Settings, UserRoundCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/', icon: House },
  { label: 'Appointments', to: '/appointments', icon: CalendarDays },
  { label: 'AI Recommendations', to: '/recommendations', icon: Activity },
  { label: 'Follow-ups', to: '/followups', icon: UserRoundCheck },
  { label: 'Analytics', to: '/analytics', icon: ChartColumnBig },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="flex w-72 flex-col bg-navy text-slate-100">
      <div className="border-b border-slate-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20 text-lg font-bold text-primary-100">M</div>
          <div>
            <p className="text-lg font-semibold">MediTrack AI</p>
            <p className="text-xs text-slate-400">Clinic operations</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive ? 'bg-slate-800 text-white shadow-soft' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700 p-4 text-xs text-slate-400">
        No-show reconciliation system
      </div>
    </aside>
  );
}
