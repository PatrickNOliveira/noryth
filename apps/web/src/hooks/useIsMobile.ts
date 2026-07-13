import { useEffect, useState } from 'react';
import { breakpoints } from '../theme/tokens';

/**
 * True on phone-width screens — below the `tablet` breakpoint, the same cutoff the
 * styled `media.tablet` helper uses. Tracks resizes/orientation changes so logic
 * that must differ on mobile (e.g. closing the character sheet when a drag starts)
 * stays in sync with the CSS. SSR-safe (defaults to false when there's no window).
 */
export function useIsMobile(): boolean {
  const query = `(max-width: ${parseInt(breakpoints.tablet, 10) - 0.02}px)`;
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia(query).matches;

  const [isMobile, setIsMobile] = useState<boolean>(get);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return isMobile;
}
