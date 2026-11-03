export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[180px] text-slate-500">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500"></div>
        <span>Loading dashboard data…</span>
      </div>
    </div>
  );
}
