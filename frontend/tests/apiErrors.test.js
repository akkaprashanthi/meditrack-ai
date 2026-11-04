import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiErrorMessage } from '../src/services/apiErrors.js';

test('network and timeout errors use clear messages', () => {
  assert.match(getApiErrorMessage({ isAxiosError: true }), /Unable to connect/);
  assert.match(getApiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED' }), /timed out/);
});

test('server errors do not expose response details', () => {
  const message = getApiErrorMessage({
    isAxiosError: true,
    response: { status: 500, data: { detail: 'database password and stack trace' } },
  });

  assert.match(message, /server could not complete/i);
  assert.doesNotMatch(message, /password|stack trace/i);
});

test('validation errors ask users to review submitted information', () => {
  assert.match(getApiErrorMessage({ isAxiosError: true, response: { status: 422 } }), /review it/);
});