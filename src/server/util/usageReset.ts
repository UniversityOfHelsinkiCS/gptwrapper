/** Weekly usage reset: every Monday at 00:01, in the server's local time zone (node-cron's default). */
export const USAGE_RESET_CRON = '1 0 * * 1'

/** The next run of `USAGE_RESET_CRON` after `now`. */
export const nextUsageReset = (now: Date = new Date()): Date => {
  const reset = new Date(now)
  reset.setHours(0, 1, 0, 0)
  reset.setDate(reset.getDate() + ((1 - reset.getDay() + 7) % 7))
  if (reset <= now) reset.setDate(reset.getDate() + 7)
  return reset
}
