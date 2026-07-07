import { useEffect, useState } from 'react';
import { ThemeName } from '../theme/themes';

/**
 * Tracks the operating-system color scheme. Used as the fallback theme when the
 * user has not explicitly chosen one.
 */
export function useSystemThemePreference(): ThemeName {
  const getPreference = (): ThemeName =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';

  const [preference, setPreference] = useState<ThemeName>(getPreference);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const listener = (event: MediaQueryListEvent) =>
      setPreference(event.matches ? 'light' : 'dark');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return preference;
}
