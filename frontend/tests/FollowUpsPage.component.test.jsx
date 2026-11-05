// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../src/services/api';
import FollowUpsPage from '../src/pages/FollowUps';

vi.mock('../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const followUp = {
  id: 501,
  appointment_id: 121,
  patient_id: 'PT-0121',
  action: 'Phone Call',
  notes: 'Reached patient.',
  follow_up_date: '2026-11-05T10:30:00',
  status: 'Completed',
};

const completions = [
  { id: 701, appointment_id: 121, category: 'patient_outreach', action_taken: 'Phone Call', notes: 'Called patient.', status: 'Completed', completed_at: '2026-11-05T10:30:00' },
  { id: 702, appointment_id: 222, category: 'rescheduling', action_taken: 'SMS', notes: 'Sent options.', status: 'Completed', completed_at: '2026-11-04T09:00:00' },
];

function renderFollowUpsPage() {
  return render(
    <MemoryRouter initialEntries={['/followups']}>
      <Routes><Route path="/followups" element={<FollowUpsPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('FollowUpsPage filters', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((path, config) => {
      if (path === '/api/recommendation-completions') {
        const params = config?.params || {};
        if (params.patient_search === 'no-matches') return Promise.resolve({ data: [] });
        let results = completions;
        if (params.patient_search === 'PT-0121' || params.patient_search === 'Avery One') results = results.filter((item) => item.appointment_id === 121);
        if (params.appointment_id) results = results.filter((item) => item.appointment_id === Number(params.appointment_id));
        if (params.category) results = results.filter((item) => item.category === params.category);
        if (params.action) results = results.filter((item) => item.action_taken === params.action);
        if (params.start_date) results = results.filter((item) => item.completed_at.slice(0, 10) >= params.start_date);
        if (params.end_date) results = results.filter((item) => item.completed_at.slice(0, 10) <= params.end_date);
        return Promise.resolve({ data: results });
      }
      if (path === '/api/followups') {
        const params = config?.params || {};
        if (params.patient_search === 'no-matches') return Promise.resolve({ data: [] });
        if (params.action && params.action !== followUp.action) return Promise.resolve({ data: [] });
        if (params.status && params.status !== followUp.status) return Promise.resolve({ data: [] });
        if (params.appointment_id && Number(params.appointment_id) !== followUp.appointment_id) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: [followUp] });
      }
      return Promise.reject(new Error(`Unexpected API request: ${path}`));
    });
  });

  it('combines patient, appointment, action, status, and date filters in one API request', async () => {
    renderFollowUpsPage();
    expect(await screen.findByText('PT-0121')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search patient ID or name'), { target: { value: 'PT-0121' } });
    fireEvent.change(screen.getByLabelText('Appointment ID'), { target: { value: '121' } });
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'Phone Call' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Completed' } });
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-05' } });

    const expectedParams = {
      patient_search: 'PT-0121',
      appointment_id: '121',
      action: 'Phone Call',
      status: 'Completed',
      start_date: '2026-11-05',
      end_date: '2026-11-05',
    };
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/followups', { params: expectedParams }));
    expect(await screen.findByText('1 matching records · 1 displayed')).toBeTruthy();
  });

  it('clears all filters and reloads the unfiltered results', async () => {
    renderFollowUpsPage();
    await screen.findByText('PT-0121');
    fireEvent.change(screen.getByLabelText('Search patient ID or name'), { target: { value: 'no-matches' } });
    expect(await screen.findByText('No follow-up records match these filters. Try changing or clearing the filters.')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Clear Filters' })[0]);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/followups', { params: {} }));
    expect(screen.getByLabelText('Search patient ID or name').value).toBe('');
    expect(await screen.findByText('PT-0121')).toBeTruthy();
  });

  it('combines completed-recommendation filters and populates dropdowns from actual records', async () => {
    renderFollowUpsPage();
    expect(await screen.findByRole('option', { name: 'patient_outreach' })).toBeTruthy();

    expect(screen.getByRole('option', { name: 'rescheduling' })).toBeTruthy();
    expect(screen.getAllByRole('option', { name: 'SMS' }).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Search completed patient ID or name'), { target: { value: 'PT-0121' } });
    fireEvent.change(screen.getByLabelText('Completed appointment ID'), { target: { value: '121' } });
    fireEvent.change(screen.getByLabelText('Recommendation category'), { target: { value: 'patient_outreach' } });
    fireEvent.change(screen.getByLabelText('Action taken'), { target: { value: 'Phone Call' } });
    fireEvent.change(screen.getByLabelText('Completed from date'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Completed to date'), { target: { value: '2026-11-05' } });

    const expectedParams = {
      patient_search: 'PT-0121',
      appointment_id: '121',
      category: 'patient_outreach',
      action: 'Phone Call',
      start_date: '2026-11-05',
      end_date: '2026-11-05',
    };
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/recommendation-completions', { params: expectedParams }));
    expect(await screen.findByText('1 matching records')).toBeTruthy();
    expect(screen.getByText('Called patient.')).toBeTruthy();
  });

  it('shows a friendly no-match state and clears only completed-recommendation filters', async () => {
    renderFollowUpsPage();
    expect(await screen.findByRole('option', { name: 'patient_outreach' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search patient ID or name'), { target: { value: 'PT-0121' } });
    fireEvent.change(screen.getByLabelText('Search completed patient ID or name'), { target: { value: 'no-matches' } });
    expect(await screen.findByText('No completed recommendations match these filters. Try changing or clearing the filters.')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Clear Filters' })[1]);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/recommendation-completions', { params: {} }));
    expect(screen.getByLabelText('Search completed patient ID or name').value).toBe('');
    expect(screen.getByLabelText('Search patient ID or name').value).toBe('PT-0121');
    expect(await screen.findByRole('option', { name: 'patient_outreach' })).toBeTruthy();
  });
});