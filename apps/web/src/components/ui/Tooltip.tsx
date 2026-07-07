import React from 'react';
import styled from 'styled-components';

export type TooltipPlacement = 'top' | 'bottom';

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
`;

const Bubble = styled.span<{ $placement: TooltipPlacement }>`
  position: absolute;
  left: 50%;
  ${({ $placement }) =>
    $placement === 'top' ? 'bottom: calc(100% + 8px);' : 'top: calc(100% + 8px);'}
  transform: translateX(-50%) scale(0.96);
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  padding: ${({ theme }) => `${theme.spacing.xxs} ${theme.spacing.xs}`};
  background: ${({ theme }) => theme.colors.text};
  color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: ${({ theme }) => theme.shadow.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast};

  ${Wrapper}:hover &,
  ${Wrapper}:focus-within & {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
`;

interface TooltipProps {
  label: string;
  placement?: TooltipPlacement;
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight hover/focus tooltip (CSS only, no positioning library). Wrap a
 * focusable trigger. For long content prefer a Popover in a future story.
 */
export function Tooltip({
  label,
  placement = 'top',
  children,
  className,
}: TooltipProps) {
  return (
    <Wrapper className={className}>
      {children}
      <Bubble role="tooltip" $placement={placement}>
        {label}
      </Bubble>
    </Wrapper>
  );
}
