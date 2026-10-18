export const MAX_ATTEMPTS = 5;
/** Exponential backoff: 1m, 2m, 4m, 8m ... capped at 1h, with +-20% jitter. */
export function backoffMs(attempt: number, rand: () => number = Math.random): number {
  const base = Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 3_600_000);
  return Math.round(base * (0.8 + rand() * 0.4));
}
/** Quota errors should wait until the Pacific-midnight quota reset instead of backoff. */
export function isQuotaError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err);
  return /quotaExceeded|dailyLimitExceeded|uploadLimitExceeded/i.test(msg);
}
export function isRetryable(err: unknown): boolean {
  const code = Number((err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status);
  if ([400, 401, 403, 404].includes(code) && !isQuotaError(err)) return false;
  return true;
}
