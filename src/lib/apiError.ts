const FALLBACK = 'Something went wrong. Please try again.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * A message to show for a failed API call. The backend answers `{ detail: string }`,
 * or `{ detail: [{ msg }] }` for validation errors; network failures have no body.
 */
export const apiErrorMessage = (error: unknown): string => {
  if (!isRecord(error)) return FALLBACK;
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return "Can't reach Helpio right now. Check your connection and try again.";
  }
  const detail = isRecord(error.data) ? error.data.detail : undefined;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && isRecord(detail[0]) && typeof detail[0].msg === 'string') {
    // Pydantic prefixes custom messages with "Value error, "
    return detail[0].msg.replace(/^Value error, /, '');
  }
  return FALLBACK;
};
