export async function submitFollowUpAndRefresh({ submit, refresh }) {
  await submit();

  let refreshSucceeded = false;
  try {
    refreshSucceeded = await refresh();
  } catch {
    refreshSucceeded = false;
  }

  return { refreshSucceeded };
}

export function getFollowUpResultMessage(refreshSucceeded) {
  return refreshSucceeded
    ? 'Follow-up saved successfully.'
    : 'Follow-up saved successfully, but the appointment list could not be refreshed. Please reload the page.';
}