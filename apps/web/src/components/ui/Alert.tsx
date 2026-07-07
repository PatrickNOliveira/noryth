import React from 'react';
import styled, { css } from 'styled-components';
import { fadeIn } from '../../styles/animations';

export type AlertVariant = 'error' | 'success' | 'info' | 'warning';

const toneOf = (variant: AlertVariant) =>
  css`
    ${({ theme }) => {
      const map: Record<AlertVariant, string> = {
        error: theme.colors.danger,
        success: theme.colors.success,
        info: theme.colors.info,
        warning: theme.colors.warning,
      };
      const c = map[variant];
      return css`
        border-color: color-mix(in srgb, ${c} 55%, ${theme.colors.border});
        color: ${c};
        background: color-mix(in srgb, ${c} 10%, ${theme.colors.surface});
      `;
    }}
  `;

const Root = styled.div<{ $variant: AlertVariant }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  animation: ${fadeIn} ${({ theme }) => theme.transitions.normal};
  ${({ $variant }) => toneOf($variant)}
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
`;

const Title = styled.strong`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const Message = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

const Close = styled.button`
  flex: 0 0 auto;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  opacity: ${({ theme }) => theme.opacity.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  line-height: 1;
  padding: 0 ${({ theme }) => theme.spacing.xxs};
  &:hover {
    opacity: 1;
  }
`;

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized message surface for inline feedback (form errors, notices).
 * One visual language shared with Toast.
 */
export function Alert({
  variant = 'info',
  title,
  icon,
  onClose,
  children,
  className,
}: AlertProps) {
  return (
    <Root role="alert" $variant={variant} className={className}>
      {icon}
      <Body>
        {title && <Title>{title}</Title>}
        {children && <Message>{children}</Message>}
      </Body>
      {onClose && (
        <Close type="button" aria-label="Fechar" onClick={onClose}>
          ×
        </Close>
      )}
    </Root>
  );
}
