export function getSelectedNoShowAppointment(appointments, appointmentId) {
  return appointments.find((appointment) => String(appointment.id) === String(appointmentId))
    || appointments[0]
    || null;
}

export function getRecommendationPath(appointmentId) {
  return `/recommendations/${appointmentId}`;
}

export async function submitRecommendationCompletion({ submit, refresh }) {
  const completion = await submit();
  try {
    await refresh();
    return { completion, refreshSucceeded: true };
  } catch {
    return { completion, refreshSucceeded: false };
  }
}