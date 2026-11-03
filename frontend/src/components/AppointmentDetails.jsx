export default function AppointmentDetails({ appointment }) {
  if (!appointment) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-soft">
        Select an appointment to view summary details.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Appointment Summary</h3>
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
          {appointment.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
        <div><span className="font-medium text-slate-800">Patient</span><p>{appointment.patient_name}</p></div>
        <div><span className="font-medium text-slate-800">Patient ID</span><p>{appointment.patient_id}</p></div>
        <div><span className="font-medium text-slate-800">Department</span><p>{appointment.department}</p></div>
        <div><span className="font-medium text-slate-800">Doctor</span><p>{appointment.doctor_name}</p></div>
        <div><span className="font-medium text-slate-800">Date</span><p>{new Date(appointment.appointment_date).toLocaleDateString()}</p></div>
        <div><span className="font-medium text-slate-800">Time</span><p>{appointment.appointment_time}</p></div>
        <div><span className="font-medium text-slate-800">Previous visits</span><p>{appointment.previous_visits}</p></div>
        <div><span className="font-medium text-slate-800">Previous no-shows</span><p>{appointment.previous_no_shows}</p></div>
      </div>
    </div>
  );
}
