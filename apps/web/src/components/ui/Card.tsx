import styled, { css } from 'styled-components';

interface CardProps {
  /** Adds a hover lift + pointer affordance for clickable cards. */
  $interactive?: boolean;
  $padding?: 'sm' | 'md' | 'lg';
}

/**
 * A small page bound into the book. Faint candlelight edge on top, plate
 * border, warm shadow. Used everywhere: tables, characters, NPCs, maps…
 */
export const Card = styled.section<CardProps>`
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.md};
  padding: ${({ theme, $padding = 'lg' }) =>
    $padding === 'sm'
      ? theme.spacing.md
      : $padding === 'md'
        ? theme.spacing.lg
        : theme.spacing.xl};
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 70%, transparent),
      transparent
    );
  }

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      transition: transform ${({ theme }) => theme.transitions.normal},
        box-shadow ${({ theme }) => theme.transitions.normal},
        border-color ${({ theme }) => theme.transitions.normal};
      &:hover {
        transform: translateY(-3px);
        box-shadow: ${({ theme }) => theme.shadow.lg};
        border-color: ${({ theme }) => theme.colors.borderStrong};
      }
      &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 2px;
      }
    `}
`;

export const CardHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const CardTitle = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
`;

export const CardDescription = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

export const CardFooter = styled.footer`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;
