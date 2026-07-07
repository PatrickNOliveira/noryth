import styled, { css } from 'styled-components';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

const toneColor = (tone: BadgeTone) =>
  css`
    ${({ theme }) => {
      const map: Record<BadgeTone, string> = {
        neutral: theme.colors.textMuted,
        primary: theme.colors.primary,
        accent: theme.colors.accent,
        success: theme.colors.success,
        danger: theme.colors.danger,
        warning: theme.colors.warning,
        info: theme.colors.info,
      };
      const c = map[tone];
      return css`
        color: ${c};
        border-color: color-mix(in srgb, ${c} 45%, ${theme.colors.border});
        background: color-mix(in srgb, ${c} 12%, ${theme.colors.surface});
      `;
    }}
  `;

/**
 * Small status/label pill — e.g. a table's system ("D&D 5e"), a character's
 * class, a session's state. Quiet by default.
 */
export const Badge = styled.span<{ $tone?: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
  padding: ${({ theme }) => `2px ${theme.spacing.xs}`};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  text-transform: uppercase;
  white-space: nowrap;
  ${({ $tone = 'neutral' }) => toneColor($tone)}
`;
