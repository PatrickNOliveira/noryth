import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/**
 * Minimal ring spinner. `currentColor` for the moving arc so it adapts to any
 * context (inside a bronze button, on a card, etc.).
 */
export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  width: ${({ $size = 18 }) => $size}px;
  height: ${({ $size = 18 }) => $size}px;
  border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
  border-top-color: currentColor;
  border-radius: ${({ theme }) => theme.radius.pill};
  animation: ${spin} 0.7s linear infinite;
`;
