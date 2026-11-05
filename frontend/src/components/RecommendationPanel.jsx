function RecommendationCard({ item, onRecordAction }) {
  const completed = item.completion_status === 'Completed';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.priority === 'High' ? 'bg-red-50 text-red-700' : item.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
            {item.priority} priority
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${completed ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            {completed ? 'Completed' : 'Pending'}
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-600">{item.description}</p>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <p><span className="font-medium">Reason:</span> {item.reason}</p>
        <p className="mt-2"><span className="font-medium">Suggested action:</span> {item.suggested_action}</p>
      </div>
      {completed ? (
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <p><span className="font-medium">Action taken:</span> {item.action_taken}</p>
          <p className="mt-1"><span className="font-medium">Notes:</span> {item.completion_notes || 'None'}</p>
          {item.completed_at ? <p className="mt-1"><span className="font-medium">Completed:</span> {new Date(item.completed_at).toLocaleString()}</p> : null}
        </div>
      ) : (
        <button onClick={() => onRecordAction(item)} className="mt-4 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Record Action
        </button>
      )}
    </article>
  );
}

export default function RecommendationPanel({ recommendations, onRecordAction }) {
  if (!recommendations || !recommendations.recommendations?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-soft">
        No recommendations available for this appointment.
      </div>
    );
  }

  const pending = recommendations.recommendations.filter((item) => item.completion_status !== 'Completed');
  const completed = recommendations.recommendations.filter((item) => item.completion_status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
        <p className="font-semibold">AI insight</p>
        <p className="mt-2">{recommendations.ai_insight}</p>
      </div>
      <section aria-labelledby="pending-recommendations-heading" className="space-y-3">
        <h3 id="pending-recommendations-heading" className="text-lg font-semibold text-slate-900">Pending recommendations ({pending.length})</h3>
        {pending.length ? pending.map((item) => <RecommendationCard key={item.category} item={item} onRecordAction={onRecordAction} />) : <p className="text-sm text-slate-500">No pending recommendations.</p>}
      </section>
      <section aria-labelledby="completed-recommendations-heading" className="space-y-3">
        <h3 id="completed-recommendations-heading" className="text-lg font-semibold text-slate-900">Completed recommendations ({completed.length})</h3>
        {completed.length ? completed.map((item) => <RecommendationCard key={item.category} item={item} onRecordAction={onRecordAction} />) : <p className="text-sm text-slate-500">No recommendations completed yet.</p>}
      </section>
    </div>
  );
}
