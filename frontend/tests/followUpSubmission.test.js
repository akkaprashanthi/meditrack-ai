import assert from 'node:assert/strict';
import test from 'node:test';
import { getFollowUpResultMessage, submitFollowUpAndRefresh } from '../src/services/followUpSubmission.js';

test('successful follow-up submission and refresh report success', async () => {
  let submitted = false;
  let refreshed = false;
  const result = await submitFollowUpAndRefresh({
    submit: async () => { submitted = true; },
    refresh: async () => { refreshed = true; return true; },
  });

  assert.equal(submitted, true);
  assert.equal(refreshed, true);
  assert.deepEqual(result, { refreshSucceeded: true });
  assert.equal(getFollowUpResultMessage(result.refreshSucceeded), 'Follow-up saved successfully.');
});

test('successful save with failed refresh reports the saved state accurately', async () => {
  const result = await submitFollowUpAndRefresh({
    submit: async () => {},
    refresh: async () => false,
  });

  assert.deepEqual(result, { refreshSucceeded: false });
  assert.equal(
    getFollowUpResultMessage(result.refreshSucceeded),
    'Follow-up saved successfully, but the appointment list could not be refreshed. Please reload the page.',
  );
});

test('failed save can be retried and does not refresh before a successful save', async () => {
  let refreshed = false;
  let attempts = 0;
  const submit = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('request failed');
  };

  await assert.rejects(
    submitFollowUpAndRefresh({
      submit,
      refresh: async () => { refreshed = true; return true; },
    }),
    /request failed/,
  );
  assert.equal(refreshed, false);

  const result = await submitFollowUpAndRefresh({
    submit,
    refresh: async () => { refreshed = true; return true; },
  });
  assert.equal(attempts, 2);
  assert.equal(refreshed, true);
  assert.deepEqual(result, { refreshSucceeded: true });
});

test('a refresh exception is treated as a refresh failure after a successful save', async () => {
  const result = await submitFollowUpAndRefresh({
    submit: async () => {},
    refresh: async () => { throw new Error('refresh failed'); },
  });

  assert.deepEqual(result, { refreshSucceeded: false });
});