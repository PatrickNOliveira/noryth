/**
 * Helpers to keep async AI image generation from getting "silently stuck" while
 * still preventing a user from re-triggering a generation that is genuinely in
 * flight.
 *
 * A generation that has been `pending`/`processing` for less than
 * {@link IMAGE_GENERATION_STALE_MS} is considered IN FLIGHT (a new request is
 * rejected). Past that window it is considered STALE — e.g. the queue worker
 * never ran, or a job vanished — so a new generation is allowed to recover.
 *
 * The window must comfortably exceed the worst-case real duration (per-request
 * timeout × retries + backoff) so a slow-but-live job is never preempted.
 */
export const IMAGE_GENERATION_STALE_MS = 8 * 60 * 1000; // 8 minutes

/**
 * Whether an image generation is currently in flight for an entity, based on
 * its image status and when it was last touched.
 */
export function imageGenerationInFlight(
  imageStatus: string,
  updatedAt: Date,
): boolean {
  if (imageStatus !== 'pending' && imageStatus !== 'processing') return false;
  return Date.now() - updatedAt.getTime() < IMAGE_GENERATION_STALE_MS;
}
