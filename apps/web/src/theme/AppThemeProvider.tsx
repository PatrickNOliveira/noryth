import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useThemeMode } from '../hooks/useThemeMode';
import { GlobalStyle } from './global-styles';
import { themes } from './themes';

/**
 * Applies the resolved theme (persisted preference → system fallback) to the
 * whole tree and injects the global baseline. All other components read the
 * theme exclusively through styled-components.
 */
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();

  return (
    <StyledThemeProvider theme={themes[mode]}>
      <GlobalStyle />
      {children}
    </StyledThemeProvider>
  );
}
