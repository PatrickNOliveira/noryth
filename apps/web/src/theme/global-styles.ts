import { createGlobalStyle } from 'styled-components';

/**
 * Global baseline. Reset-ish rules plus theme-aware, book-like styling.
 *
 * The background is a pure-CSS candlelit wash (warm vignette) over the deep
 * base color — no heavy images or textures. `overflow-x: hidden` guarantees no
 * horizontal scroll on any screen.
 */
export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    height: 100%;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-family: ${({ theme }) => theme.typography.fontFamily.body};
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    line-height: ${({ theme }) => theme.typography.lineHeight.normal};
    color: ${({ theme }) => theme.colors.text};
    background-color: ${({ theme }) => theme.colors.background};
    background-image:
      radial-gradient(
        130% 90% at 50% -20%,
        ${({ theme }) => theme.colors.backgroundAlt} 0%,
        transparent 55%
      ),
      radial-gradient(
        90% 60% at 100% 0%,
        color-mix(in srgb, ${({ theme }) => theme.colors.primary} 8%, transparent) 0%,
        transparent 45%
      );
    background-attachment: fixed;
    overflow-x: hidden;
    min-height: 100dvh;
    transition: background-color ${({ theme }) => theme.transitions.normal},
      color ${({ theme }) => theme.transitions.normal};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1, h2, h3, h4 {
    font-family: ${({ theme }) => theme.typography.fontFamily.heading};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    line-height: ${({ theme }) => theme.typography.lineHeight.tight};
    letter-spacing: ${({ theme }) => theme.typography.letterSpacing.tight};
    color: ${({ theme }) => theme.colors.text};
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button, input, textarea, select {
    font: inherit;
    color: inherit;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  ::selection {
    background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 30%, transparent);
    color: ${({ theme }) => theme.colors.text};
  }

  img, svg {
    display: block;
    max-width: 100%;
  }

  /* Discreet, themed scrollbar. */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.borderStrong} transparent;
  }
  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radius.pill};
    border: 3px solid transparent;
    background-clip: padding-box;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
