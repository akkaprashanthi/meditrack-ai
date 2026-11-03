export default function StatCard({ title, value, detail, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className={`rounded-full px-2 py-1 text-xs ring-1 ${tones[tone]}`}>{detail}</span>
      </div>
      <h3 className="text-3xl font-semibold text-slate-900">{value}</h3>
    </div>
  );
}
