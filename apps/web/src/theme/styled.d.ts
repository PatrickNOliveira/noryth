import 'styled-components';
import { AppTheme } from './themes';

/**
 * Augments styled-components' DefaultTheme so `theme` is fully typed inside
 * every styled template and `useTheme()` call.
 */
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends AppTheme {}
}
