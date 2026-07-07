import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyledProps {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $loading: boolean;
}

const sizeStyles = {
  sm: css`
    min-height: 38px;
    padding: ${({ theme }) => `${theme.spacing.xxs} ${theme.spacing.md}`};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  `,
  md: css`
    min-height: 48px;
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xl}`};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  `,
  lg: css`
    min-height: 54px;
    padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.xl}`};
    font-size: ${({ theme }) => theme.typography.fontSize.md};
  `,
};

const variantStyles = {
  primary: css`
    background: linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.primaryHover},
      ${({ theme }) => theme.colors.primary}
    );
    color: ${({ theme }) => theme.colors.onPrimary};
    border-color: color-mix(
      in srgb,
      ${({ theme }) => theme.colors.onPrimary} 18%,
      ${({ theme }) => theme.colors.primary}
    );
    box-shadow: ${({ theme }) => theme.shadow.sm};
    &:hover:not(:disabled) {
      box-shadow: ${({ theme }) => theme.shadow.glow}, ${({ theme }) => theme.shadow.sm};
      transform: translateY(-1px);
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.primary};
      color: ${({ theme }) => theme.colors.primary};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.primary};
      color: ${({ theme }) => theme.colors.primary};
      background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 8%, transparent);
    }
  `,
  danger: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.danger};
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.danger} 50%, ${({ theme }) => theme.colors.border});
    &:hover:not(:disabled) {
      background: color-mix(in srgb, ${({ theme }) => theme.colors.danger} 12%, transparent);
      border-color: ${({ theme }) => theme.colors.danger};
    }
  `,
};

const StyledButton = styled.button<StyledProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  transition: background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast},
    opacity ${({ theme }) => theme.transitions.fast};

  ${({ $size }: StyledProps) => sizeStyles[$size]}
  ${({ $variant }: StyledProps) => variantStyles[$variant]}

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: ${({ theme, $loading }) => ($loading ? 0.9 : theme.opacity.disabled)};
    cursor: ${({ $loading }) => ($loading ? 'progress' : 'not-allowed')};
    box-shadow: none;
    transform: none;
  }
`;

const Content = styled.span<{ $hidden: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
`;

const SpinnerSlot = styled.span`
  position: absolute;
  display: inline-flex;
`;

const Relative = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Primary action component. Bronze `primary`, quiet `ghost`/`secondary`,
 * outlined `danger`. Loading swaps the label for a spinner without resizing.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...rest
    },
    ref,
  ) => (
    <StyledButton
      ref={ref}
      type={rest.type ?? 'button'}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      $loading={loading}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Relative>
        {loading && (
          <SpinnerSlot>
            <Spinner $size={16} />
          </SpinnerSlot>
        )}
        <Content $hidden={loading}>
          {leftIcon}
          {children}
          {rightIcon}
        </Content>
      </Relative>
    </StyledButton>
  ),
);

Button.displayName = 'Button';
