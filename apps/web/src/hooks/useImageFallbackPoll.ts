import { useEffect } from 'react';

/**
 * Gentle, self-terminating fallback poll for async image generation. Runs only
 * while `active` (i.e. status is pending/processing), on a slow interval, and
 * stops automatically once it turns false. It's a safety net for a missed
 * realtime event or a recovered/failed backend state — NOT the primary channel.
 */
export function useImageFallbackPoll(
  active: boolean,
  onTick: () => void,
  intervalMs = 15000,
): void {
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(onTick, intervalMs);
    return () => window.clearInterval(id);
    // onTick is expected to be stable enough (deps recompute when `active` flips).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs]);
}
