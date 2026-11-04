export function getApiErrorMessage(error) {
  if (!error?.isAxiosError) {
    return 'Something went wrong. Please try again.';
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'The request timed out. Please try again.';
    }
    return 'Unable to connect to the server. Check your connection and try again.';
  }

  const { status } = error.response;
  if (status >= 500) {
    return 'The server could not complete the request. Please try again.';
  }
  if (status === 404) {
    return 'The requested record could not be found.';
  }
  if (status === 400 || status === 422) {
    return 'Some submitted information was not accepted. Please review it and try again.';
  }
  if (status === 401 || status === 403) {
    return 'You do not have permission to complete this request.';
  }

  return 'The request could not be completed. Please try again.';
}