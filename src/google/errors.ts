export const GOOGLE_NOT_CONFIGURED_MESSAGE =
  'Google client not configured. Use GOOGLE_SERVICE_ACCOUNT_PATH, set the complete ' +
  'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN environment variables, ' +
  'or run "app-publish-mcp auth google" to create the saved OAuth token.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getGoogleApiStatus(error: unknown): number | undefined {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  return typeof error.response.status === 'number' ? error.response.status : undefined;
}

function selectGoogleErrorPayload(data: unknown): unknown {
  const payload = isRecord(data) && 'error' in data ? data.error : data;
  if (!isRecord(payload)) return typeof payload === 'string' ? payload : undefined;

  const selected: Record<string, unknown> = {};
  for (const key of ['code', 'message', 'status', 'errors', 'details']) {
    if (key in payload) selected[key] = payload[key];
  }
  return Object.keys(selected).length > 0 ? selected : undefined;
}

export function formatGoogleApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!isRecord(error) || !isRecord(error.response)) return message;

  const status = getGoogleApiStatus(error);
  const payload = selectGoogleErrorPayload(error.response.data);
  const statusText = status != null && !message.includes(String(status)) ? ` (HTTP ${status})` : '';
  if (payload === undefined) return `${message}${statusText}`;

  return `${message}${statusText}\nGoogle Play API: ${JSON.stringify(payload)}`;
}
