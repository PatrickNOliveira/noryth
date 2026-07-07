import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';

export type IconButtonVariant = 'ghost' | 'solid' | 'subtle';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<IconButtonSize, string> = {
  sm: '36px',
  md: '44px',
  lg: '52px',
};

const variantStyles = {
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    border-color: transparent;
    &:hover:not(:disabled) {
      color: ${({ theme }) => theme.colors.primary};
      background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, transparent);
    }
  `,
  subtle: css`
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.primary};
      color: ${({ theme }) => theme.colors.primary};
    }
  `,
  solid: css`
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.onPrimary};
    border-color: ${({ theme }) => theme.colors.primary};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.primaryHover};
    }
  `,
};

const Root = styled.button<{ $variant: IconButtonVariant; $size: IconButtonSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: ${({ $size }: { $size: IconButtonSize }) => sizeMap[$size]};
  height: ${({ $size }: { $size: IconButtonSize }) => sizeMap[$size]};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast};

  ${({ $variant }: { $variant: IconButtonVariant }) => variantStyles[$variant]}

  &:active:not(:disabled) {
    transform: scale(0.94);
  }
  &:disabled {
    opacity: ${({ theme }) => theme.opacity.disabled};
    cursor: not-allowed;
  }
`;

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required since the button has no text. */
  label: string;
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

/** Square, icon-only action. `label` becomes the accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, variant = 'ghost', size = 'md', ...rest }, ref) => (
    <Root
      ref={ref}
      type={rest.type ?? 'button'}
      aria-label={label}
      title={label}
      $variant={variant}
      $size={size}
      {...rest}
    >
      {icon}
    </Root>
  ),
);

IconButton.displayName = 'IconButton';
