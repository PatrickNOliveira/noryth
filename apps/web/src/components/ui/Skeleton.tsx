import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -180% 0; }
  100% { background-position: 180% 0; }
`;

/**
 * Loading placeholder with a soft candlelight sweep. Compose several to sketch
 * a card or list while data loads. `$radius` defaults to the token md.
 */
export const Skeleton = styled.span<{
  $width?: string;
  $height?: string;
  $radius?: string;
  $circle?: boolean;
}>`
  display: block;
  width: ${({ $width = '100%' }) => $width};
  height: ${({ $height = '1rem' }) => $height};
  border-radius: ${({ theme, $radius, $circle }) =>
    $circle ? theme.radius.pill : ($radius ?? theme.radius.md)};
  background: linear-gradient(
    100deg,
    ${({ theme }) => theme.colors.surfaceAlt} 30%,
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, ${({ theme }) => theme.colors.surfaceAlt}) 50%,
    ${({ theme }) => theme.colors.surfaceAlt} 70%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;
