import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRecommendationPath,
  getSelectedNoShowAppointment,
  submitRecommendationCompletion,
} from '../src/services/recommendationWorkflow.js';

const appointments = [
  { id: 12, patient_name: 'First Patient' },
  { id: 34, patient_name: 'Selected Patient' },
];

test('selects the exact no-show appointment from the route identifier', () => {
  assert.equal(getSelectedNoShowAppointment(appointments, '34'), appointments[1]);
  assert.equal(getSelectedNoShowAppointment(appointments, 'missing'), appointments[0]);
  assert.equal(getSelectedNoShowAppointment([], '12'), null);
  assert.equal(getRecommendationPath(34), '/recommendations/34');
});

test('completion workflow returns persisted result and distinguishes refresh failure', async () => {
  const record = { id: 7, category: 'patient_outreach', status: 'Completed' };
  const result = await submitRecommendationCompletion({
    submit: async () => record,
    refresh: async () => { throw new Error('refresh failed'); },
  });

  assert.equal(result.completion, record);
  assert.equal(result.refreshSucceeded, false);
});

test('completion workflow propagates submit failures for modal retry', async () => {
  await assert.rejects(
    submitRecommendationCompletion({
      submit: async () => { throw new Error('save failed'); },
      refresh: async () => {},
    }),
    /save failed/,
  );
});