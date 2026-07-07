import React from 'react';
import styled, { css } from 'styled-components';
import { media } from '../../styles/media';

export type TomeVariant = 'feature' | 'entry';

interface RootProps {
  $variant: TomeVariant;
  $interactive: boolean;
}

const Root = styled.article<RootProps>`
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.surface},
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, ${({ theme }) => theme.colors.surface})
  );
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  /* Right edge shaped like stacked pages. */
  box-shadow: ${({ theme }) => theme.shadow.md},
    inset -3px 0 0 -1px color-mix(in srgb, ${({ theme }) => theme.colors.border} 60%, transparent),
    inset -6px 0 0 -2px color-mix(in srgb, ${({ theme }) => theme.colors.border} 40%, transparent);
  overflow: hidden;
  transition: transform ${({ theme }) => theme.transitions.normal},
    box-shadow ${({ theme }) => theme.transitions.normal},
    border-color ${({ theme }) => theme.transitions.normal};

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-3px) rotate(-0.3deg);
        border-color: ${({ theme }) => theme.colors.borderStrong};
        box-shadow: ${({ theme }) => theme.shadow.lg},
          inset -3px 0 0 -1px color-mix(in srgb, ${({ theme }) => theme.colors.border} 60%, transparent),
          inset -6px 0 0 -2px color-mix(in srgb, ${({ theme }) => theme.colors.border} 40%, transparent);
      }
      &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 2px;
      }
    `}
`;

/** The book spine: bronze binding with two raised bands. */
const Spine = styled.div<{ $variant: TomeVariant }>`
  width: ${({ $variant }) => ($variant === 'feature' ? '16px' : '10px')};
  background: linear-gradient(
    90deg,
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 85%, black),
    ${({ theme }) => theme.colors.primary} 45%,
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 70%, black)
  );
  box-shadow:
    inset 0 8px 0 -6px color-mix(in srgb, ${({ theme }) => theme.colors.onPrimary} 35%, transparent),
    inset 0 -8px 0 -6px color-mix(in srgb, ${({ theme }) => theme.colors.onPrimary} 35%, transparent);
`;

const Cover = styled.div<{ $variant: TomeVariant }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme, $variant }) =>
    $variant === 'feature'
      ? `${theme.spacing.lg} ${theme.spacing.lg}`
      : `${theme.spacing.md} ${theme.spacing.md}`};

  ${({ $variant }) =>
    $variant === 'feature' &&
    css`
      ${media.tablet} {
        padding: ${({ theme }) => theme.spacing.xl};
      }
    `}
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Titles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Kicker = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h3<{ $variant: TomeVariant }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme, $variant }) =>
    $variant === 'feature'
      ? theme.typography.fontSize.xxl
      : theme.typography.fontSize.lg};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Description = styled.p`
  margin-top: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

/** Fabric bookmark ribbon hanging from the top edge. */
const Ribbon = styled.span`
  position: absolute;
  top: 0;
  right: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.xxs}`};
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.onAccent};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: 0.68rem;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  text-transform: uppercase;
  writing-mode: vertical-rl;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%);
`;

export interface TomeCardProps {
  title: string;
  subtitle?: string;
  /** Small overline, e.g. "Campanha em andamento". */
  kicker?: string;
  /** Vertical bookmark label, e.g. "Ativa". */
  ribbon?: string;
  /** Badges / small meta row. */
  meta?: React.ReactNode;
  variant?: TomeVariant;
  onClick?: () => void;
  /** Description line (shown mainly in the feature variant). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * A campaign as a bound volume, not a rectangle: bronze spine with raised
 * bands, a cover with an engraved serif title, an optional bookmark ribbon and
 * page-stack edges. `feature` is the large hero tome; `entry` is a compact
 * volume for shelves/registers.
 */
export function TomeCard({
  title,
  subtitle,
  kicker,
  ribbon,
  meta,
  variant = 'entry',
  onClick,
  children,
  className,
}: TomeCardProps) {
  const interactive = !!onClick;
  return (
    <Root
      $variant={variant}
      $interactive={interactive}
      className={className}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <Spine $variant={variant} aria-hidden="true" />
      <Cover $variant={variant}>
        <TopRow>
          <Titles>
            {kicker && <Kicker>{kicker}</Kicker>}
            <Title $variant={variant}>{title}</Title>
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
          </Titles>
        </TopRow>
        {children && <Description>{children}</Description>}
        {meta && <Meta>{meta}</Meta>}
      </Cover>
      {ribbon && <Ribbon aria-hidden="true">{ribbon}</Ribbon>}
    </Root>
  );
}
