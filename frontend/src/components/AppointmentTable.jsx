import { AlertCircle, CheckCircle2, PhoneCall, SearchX } from 'lucide-react';

const statusColors = {
  Scheduled: 'bg-blue-50 text-blue-700',
  Completed: 'bg-green-50 text-green-700',
  'No-Show': 'bg-red-50 text-red-700',
  Cancelled: 'bg-slate-200 text-slate-700',
  'Followed Up': 'bg-amber-50 text-amber-700',
};

export default function AppointmentTable({ appointments, onSelect, onGenerateRecommendation, onFollowUp }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-sm text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Doctor</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Visits</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recommendation progress</th>
              <th className="px-4 py-3 font-medium">Patient Outreach</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                  No appointments found.
                </td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr key={appointment.id} className={appointment.status === 'No-Show' ? 'bg-red-50/40' : 'bg-white'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {appointment.patient_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{appointment.patient_name}</p>
                        <p className="text-xs text-slate-500">{appointment.patient_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{new Date(appointment.appointment_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{appointment.department}</td>
                  <td className="px-4 py-3">{appointment.doctor_name}</td>
                  <td className="px-4 py-3">{appointment.appointment_type}</td>
                  <td className="px-4 py-3">{appointment.previous_visits}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[appointment.status] || 'bg-slate-100 text-slate-700'}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {appointment.status === 'No-Show' ? (
                      <div className="min-w-36 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-700">
                            {appointment.recommendation_completion_count || 0}/{appointment.recommendation_completion_total || 3} Completed
                          </span>
                          <span className={`text-xs font-medium ${appointment.recommendation_progress_status === 'Completed' ? 'text-green-700' : appointment.recommendation_progress_status === 'In Progress' ? 'text-amber-700' : 'text-slate-500'}`}>
                            {appointment.recommendation_progress_status || 'Pending'}
                          </span>
                        </div>
                        <progress
                          aria-label={`Recommendation completion for ${appointment.patient_name}`}
                          value={appointment.recommendation_completion_count || 0}
                          max={appointment.recommendation_completion_total || 3}
                          className="h-1.5 w-full accent-green-600"
                        />
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {appointment.follow_up_recorded ? (
                      <div className="min-w-36 space-y-1">
                        <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          Recorded
                        </span>
                        <p className="text-xs font-medium text-slate-700">{appointment.latest_follow_up_action}</p>
                        {appointment.latest_follow_up_date ? (
                          <p className="text-xs text-slate-500">{new Date(appointment.latest_follow_up_date).toLocaleString()}</p>
                        ) : null}
                        {appointment.latest_follow_up_status ? (
                          <p className="text-xs text-slate-500">{appointment.latest_follow_up_status}</p>
                        ) : null}
                        {appointment.latest_follow_up_notes ? (
                          <details className="pt-1 text-xs">
                            <summary className="cursor-pointer font-medium text-primary-700">View notes</summary>
                            <p className="mt-1 max-w-56 whitespace-pre-wrap text-slate-600">{appointment.latest_follow_up_notes}</p>
                          </details>
                        ) : null}
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Not Recorded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onSelect(appointment)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs hover:bg-slate-100">
                        View
                      </button>
                      {appointment.status === 'No-Show' ? (
                        <button onClick={() => onGenerateRecommendation(appointment.id)} className="rounded-lg bg-primary-600 px-2 py-1.5 text-xs text-white hover:bg-primary-700">
                          View Recommendations
                        </button>
                      ) : null}
                      {appointment.status === 'No-Show' ? (
                        <button onClick={() => onFollowUp(appointment)} className="rounded-lg bg-amber-500 px-2 py-1.5 text-xs text-white hover:bg-amber-600">
                          Follow up
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
