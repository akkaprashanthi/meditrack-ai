// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import api from '../src/services/api';
import App from '../src/App';

vi.mock('../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe('sidebar page navigation', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    api.get.mockImplementation((path) => {
      if (path === '/health') return Promise.resolve({ data: { status: 'ok', service: 'MediTrack AI' } });
      if (path === '/api/appointments/stats') {
        return Promise.resolve({ data: {
          total_appointments: 12,
          completed_appointments: 4,
          no_show_appointments: 2,
          pending_followups: 1,
          no_show_rate: 16.67,
          appointments_today: 2,
          upcoming_appointments: 6,
        } });
      }
      if (path === '/api/appointments' || path === '/api/analytics/weekly-trends' || path === '/api/analytics/department-stats' || path === '/api/followups' || path === '/api/recommendation-completions') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
  });

  it('switches repeatedly between Dashboard and Settings and keeps other sidebar routes working', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Appointment overview' })).toBeTruthy();
    expect(screen.getByText('Total appointments')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Clinic information' })).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText(/informational only/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Appointment overview' })).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Appointment overview' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Appointment overview' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Appointments' }));
    expect(await screen.findByRole('heading', { name: 'Patient schedule management' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'AI Recommendations' }));
    expect(await screen.findByText('AI Recommendations')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Follow-ups' }));
    expect(await screen.findByRole('heading', { name: 'Clinical outreach log' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Analytics' }));
    expect(await screen.findByText('Avg. no-show rate')).toBeTruthy();
  });

  it('refreshes Dashboard pending follow-ups after the orange follow-up submission', async () => {
    let pendingFollowups = 1;
    let statsRequests = 0;
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
      follow_up_status: 'Pending',
      recommendation_completion_count: 0,
      recommendation_completion_total: 3,
      recommendation_progress_status: 'Pending',
      follow_up_recorded: false,
      latest_follow_up_action: null,
      latest_follow_up_notes: null,
      latest_follow_up_date: null,
      latest_follow_up_status: null,
    };

    api.get.mockImplementation((path) => {
      if (path === '/api/appointments/stats') {
        statsRequests += 1;
        return Promise.resolve({ data: {
          total_appointments: 12,
          completed_appointments: 4,
          no_show_appointments: 2,
          pending_followups: pendingFollowups,
          no_show_rate: 16.67,
          appointments_today: 2,
          upcoming_appointments: 6,
        } });
      }
      if (path === '/api/appointments') return Promise.resolve({ data: [appointment] });
      if (path === '/api/analytics/weekly-trends' || path === '/api/analytics/department-stats') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
    api.post.mockImplementation((_path, payload) => {
      expect(payload.appointment_id).toBe(45);
      pendingFollowups = 0;
      return Promise.resolve({ data: { message: 'Follow-up saved successfully' } });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Appointment overview' });
    fireEvent.click(screen.getByRole('link', { name: 'Appointments' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Follow up' }));
    fireEvent.change(screen.getByPlaceholderText('Add optional notes about the outcome...'), { target: { value: 'Reached patient.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm follow-up' }));
    expect(await screen.findByText('Follow-up saved successfully.')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    await waitFor(() => expect(statsRequests).toBe(2));
    const pendingCard = screen.getByText('Pending follow-ups').closest('.rounded-2xl');
    expect(within(pendingCard).getByText('0')).toBeTruthy();
  });
});