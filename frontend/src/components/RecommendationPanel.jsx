export default function RecommendationPanel({ recommendations }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-soft">
        No AI recommendations available for this record.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
        <p className="font-semibold">AI insight</p>
        <p className="mt-2">{recommendations.ai_insight}</p>
      </div>

      {recommendations.recommendations.map((item, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              item.priority === 'High' ? 'bg-red-50 text-red-700' : item.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}>{item.priority}</span>
          </div>
          <p className="text-sm text-slate-600">{item.description}</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <p><span className="font-medium">Reason:</span> {item.reason}</p>
            <p className="mt-2"><span className="font-medium">Action:</span> {item.suggested_action}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
