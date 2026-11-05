// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import api from '../src/services/api';
import RecommendationsPage from '../src/pages/Recommendations';
import AppointmentsPage from '../src/pages/Appointments';
import AppointmentTable from '../src/components/AppointmentTable';

vi.mock('../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const appointments = [
  { id: 11, patient_name: 'Avery One', department: 'Cardiology' },
  { id: 22, patient_name: 'Riley Two', department: 'Neurology' },
];

function makeRecommendations(appointmentId, completion = null) {
  return {
    appointment_id: appointmentId,
    patient_name: appointments.find((item) => item.id === appointmentId).patient_name,
    ai_insight: 'Review the appointment history.',
    recommendations: [{
      title: 'Patient outreach',
      description: 'Contact the patient.',
      reason: 'Prior missed appointment.',
      priority: 'High',
      suggested_action: 'Call within 24 hours.',
      category: 'patient_outreach',
      completion_status: completion ? 'Completed' : 'Pending',
      action_taken: completion?.action_taken || null,
      completion_notes: completion?.notes || null,
      completed_at: completion?.completed_at || null,
    }],
  };
}

function renderPage(appointmentId = 11) {
  return render(
    <MemoryRouter initialEntries={[`/recommendations/${appointmentId}`]}>
      <LocationProbe />
      <Routes>
        <Route path="/recommendations/:appointmentId" element={<RecommendationsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-route">{location.pathname}</output>;
}

describe('recommendations workflow', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path) => {
      if (path === '/api/appointments') return Promise.resolve({ data: appointments });
      const selectedId = Number(path.split('/').pop());
      return Promise.resolve({ data: makeRecommendations(selectedId) });
    });
  });

  it('loads the selected appointment and fetches recommendations when selection changes', async () => {
    renderPage(22);
    expect(await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent.includes('Recommendations for Riley Two'))).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/api/recommendations/22');
    fireEvent.change(screen.getByLabelText('No-show appointment'), { target: { value: '11' } });
    await waitFor(() => expect(screen.getByTestId('current-route').textContent).toBe('/recommendations/11'));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/recommendations/11'));
  });

  it('submits the action and notes, then displays persisted completion state', async () => {
    let completion = null;
    api.get.mockImplementation((path) => {
      if (path === '/api/appointments') return Promise.resolve({ data: appointments });
      const selectedId = Number(path.split('/').pop());
      return Promise.resolve({ data: makeRecommendations(selectedId, completion) });
    });
    api.post.mockImplementation((_path, payload) => {
      completion = {
        id: 3,
        appointment_id: 11,
        category: payload.category,
        action_taken: payload.action_taken,
        notes: payload.notes,
        status: 'Completed',
        completed_at: '2026-11-05T12:00:00',
      };
      return Promise.resolve({ data: completion });
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Record Action' }));
    fireEvent.change(screen.getByLabelText('Action taken'), { target: { value: 'SMS' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Message sent.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark completed' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/api/recommendations/11/completions',
      { category: 'patient_outreach', action_taken: 'SMS', notes: 'Message sent.' },
    ));
    expect(await screen.findByText('Completed recommendations (1)')).toBeTruthy();
    expect(screen.getByText('Message sent.')).toBeTruthy();
  });

  it('shows a save error and permits retrying the modal submission', async () => {
    api.post
      .mockRejectedValueOnce(new Error('The server could not complete the request. Please try again.'))
      .mockResolvedValueOnce({ data: {
        id: 4,
        appointment_id: 11,
        category: 'patient_outreach',
        action_taken: 'Phone Call',
        notes: '',
        status: 'Completed',
        completed_at: '2026-11-05T12:00:00',
      } });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Record Action' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark completed' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Please try again.');
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mark completed' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Completed recommendations (1)')).toBeTruthy();
  });
});

describe('appointment recommendation progress', () => {
  afterEach(() => cleanup());

  it('renders persisted progress states and invokes the selected appointment action', () => {
    const onGenerateRecommendation = vi.fn();
    const progressAppointments = [
      { ...appointments[0], status: 'No-Show', patient_id: 'P-11', appointment_date: '2026-11-05', doctor_name: 'Dr One', appointment_type: 'Consultation', previous_visits: 1, recommendation_completion_count: 0, recommendation_completion_total: 3, recommendation_progress_status: 'Pending', follow_up_recorded: false },
      { ...appointments[1], status: 'No-Show', patient_id: 'P-22', appointment_date: '2026-11-05', doctor_name: 'Dr Two', appointment_type: 'Follow-up', previous_visits: 2, recommendation_completion_count: 1, recommendation_completion_total: 3, recommendation_progress_status: 'In Progress', follow_up_recorded: true, latest_follow_up_action: 'SMS', latest_follow_up_notes: 'Latest saved note.', latest_follow_up_date: '2026-11-05T12:00:00', latest_follow_up_status: 'Completed' },
      { ...appointments[0], id: 33, patient_name: 'Jordan Three', patient_id: 'P-33', status: 'No-Show', appointment_date: '2026-11-05', doctor_name: 'Dr Three', appointment_type: 'Consultation', previous_visits: 3, recommendation_completion_count: 3, recommendation_completion_total: 3, recommendation_progress_status: 'Completed', follow_up_recorded: false },
    ];

    render(
      <AppointmentTable
        appointments={progressAppointments}
        onSelect={vi.fn()}
        onGenerateRecommendation={onGenerateRecommendation}
        onFollowUp={vi.fn()}
      />,
    );

    expect(screen.getByText('0/3 Completed')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('1/3 Completed')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('3/3 Completed')).toBeTruthy();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
    expect(screen.getAllByText('Not Recorded')).toHaveLength(2);
    expect(screen.getByText('SMS')).toBeTruthy();
    const notesDisclosure = screen.getByText('View notes').closest('details');
    expect(notesDisclosure.open).toBe(false);
    fireEvent.click(screen.getByText('View notes'));
    expect(notesDisclosure.open).toBe(true);
    expect(screen.getByText('Latest saved note.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'View Recommendations' })[1]);
    expect(onGenerateRecommendation).toHaveBeenCalledWith(22);
  });
});

describe('Appointments follow-up refresh', () => {
  afterEach(() => cleanup());

  it('updates patient outreach immediately after the Follow up form saves', async () => {
    const appointment = {
      id: 45,
      patient_name: 'Casey Patient',
      patient_id: 'P-45',
      appointment_date: '2026-11-05T00:00:00',
      department: 'Cardiology',
      doctor_name: 'Dr Case',
      appointment_type: 'Consultation',
      previous_visits: 2,
      status: 'No-Show',
      recommendation_completion_count: 1,
      recommendation_completion_total: 3,
      recommendation_progress_status: 'In Progress',
      follow_up_recorded: false,
      latest_follow_up_action: null,
      latest_follow_up_notes: null,
      latest_follow_up_date: null,
      latest_follow_up_status: null,
    };
    let listRequests = 0;
    api.get.mockImplementation((path) => {
      if (path !== '/api/appointments') throw new Error(`Unexpected API request: ${path}`);
      listRequests += 1;
      return Promise.resolve({
        data: [listRequests === 1 ? appointment : {
          ...appointment,
          follow_up_recorded: true,
          latest_follow_up_action: 'Phone Call',
          latest_follow_up_notes: 'Patient asked for a callback.',
          latest_follow_up_date: '2026-11-05T12:30:00',
          latest_follow_up_status: 'Completed',
        }],
      });
    });
    api.post.mockResolvedValue({ data: { message: 'Follow-up saved successfully' } });

    render(
      <MemoryRouter initialEntries={['/appointments']}>
        <Routes><Route path="/appointments" element={<AppointmentsPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Not Recorded')).toBeTruthy();
    expect(screen.getByText('1/3 Completed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Follow up' }));
    fireEvent.change(screen.getByPlaceholderText('Add optional notes about the outcome...'), { target: { value: 'Patient asked for a callback.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm follow-up' }));

    expect(await screen.findByText('Recorded')).toBeTruthy();
    expect(screen.getByText('Phone Call')).toBeTruthy();
    expect(screen.getByText('1/3 Completed')).toBeTruthy();
    expect(listRequests).toBe(2);
    fireEvent.click(screen.getByText('View notes'));
    expect(screen.getByText('Patient asked for a callback.')).toBeTruthy();
  });
});