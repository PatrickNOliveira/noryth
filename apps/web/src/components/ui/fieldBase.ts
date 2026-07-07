import { css } from 'styled-components';

/**
 * Shared visual language for text-like controls (Input, Textarea, Select).
 * Reads as a line written into the campaign book: inset surface, soft edge,
 * candlelight focus ring. Invalid state via `aria-invalid="true"`.
 */
export const fieldBase = css`
  width: 100%;
  min-height: 48px;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  box-shadow: inset 0 1px 2px
    color-mix(in srgb, ${({ theme }) => theme.colors.overlay} 40%, transparent);
  transition: border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};
  appearance: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
    opacity: ${({ theme }) => theme.opacity.muted};
  }

  &:focus,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 22%, transparent);
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.danger};
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.danger} 20%, transparent);
  }

  &:disabled {
    opacity: ${({ theme }) => theme.opacity.disabled};
    cursor: not-allowed;
  }
`;
