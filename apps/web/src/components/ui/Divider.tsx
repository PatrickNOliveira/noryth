import React from 'react';
import styled from 'styled-components';

const Root = styled.div<{ $vertical: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};

  ${({ $vertical, theme }) =>
    $vertical
      ? `align-self: stretch; width: 1px; margin: 0 ${theme.spacing.sm};`
      : `width: 100%; gap: ${theme.spacing.sm};`}
`;

const Line = styled.span<{ $vertical: boolean; $flip?: boolean }>`
  ${({ $vertical }) =>
    $vertical
      ? 'flex: 1; width: 1px;'
      : 'flex: 1; height: 1px;'}
  background: ${({ theme, $vertical, $flip }) =>
    $vertical
      ? theme.colors.border
      : `linear-gradient(${$flip ? 'to left' : 'to right'}, transparent, ${theme.colors.borderStrong})`};
`;

const Diamond = styled.span`
  width: 7px;
  height: 7px;
  transform: rotate(45deg);
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Label = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
`;

interface DividerProps {
  /** 'plain' hairline, 'ornament' with a bronze lozenge, or a text label. */
  variant?: 'plain' | 'ornament';
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

/**
 * Section separator. `ornament` evokes an old book plate; `label` prints a
 * small chapter-style caption between the rules.
 */
export function Divider({
  variant = 'plain',
  orientation = 'horizontal',
  label,
  className,
}: DividerProps) {
  const vertical = orientation === 'vertical';

  if (vertical) {
    return <Root $vertical role="separator" aria-orientation="vertical" className={className}><Line $vertical /></Root>;
  }

  if (label) {
    return (
      <Root $vertical={false} role="separator" className={className}>
        <Line $vertical={false} />
        <Label>{label}</Label>
        <Line $vertical={false} $flip />
      </Root>
    );
  }

  if (variant === 'ornament') {
    return (
      <Root $vertical={false} role="separator" aria-hidden="true" className={className}>
        <Line $vertical={false} />
        <Diamond />
        <Line $vertical={false} $flip />
      </Root>
    );
  }

  return (
    <Root $vertical={false} role="separator" className={className}>
      <Line $vertical={false} />
    </Root>
  );
}
