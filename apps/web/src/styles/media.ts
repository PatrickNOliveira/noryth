import { breakpoints } from '../theme/tokens';

/**
 * Mobile-first media-query helpers. The base styles target phones; use these
 * to layer on larger screens only when needed.
 *
 *   const Grid = styled.div`
 *     display: grid;
 *     ${media.tablet} { grid-template-columns: 1fr 1fr; }
 *   `;
 */
export const media = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  tablet: `@media (min-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
} as const;
