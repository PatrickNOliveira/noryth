import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/slices/theme.slice';
import { ThemeName } from '../theme/themes';
import { useSystemThemePreference } from './useSystemThemePreference';

interface ThemeModeApi {
  /** The theme currently applied (resolved against the system preference). */
  mode: ThemeName;
  /** Whether the resolved mode comes from the OS (no explicit choice yet). */
  isSystem: boolean;
  toggle: () => void;
  set: (mode: ThemeName) => void;
}

/**
 * Single source of truth for the active theme in components. Combines the
 * persisted Redux preference with the live system preference fallback.
 */
export function useThemeMode(): ThemeModeApi {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((state) => state.theme.mode);
  const system = useSystemThemePreference();

  const mode: ThemeName = stored ?? system;

  const toggle = useCallback(() => {
    // Materialize the current resolved mode before toggling, so the first
    // toggle from "system" is predictable.
    dispatch(setTheme(mode === 'light' ? 'dark' : 'light'));
  }, [dispatch, mode]);

  const set = useCallback(
    (next: ThemeName) => dispatch(setTheme(next)),
    [dispatch],
  );

  return { mode, isSystem: stored === null, toggle, set };
}
