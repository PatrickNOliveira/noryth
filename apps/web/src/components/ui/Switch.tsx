import React, { forwardRef } from 'react';
import styled from 'styled-components';

const Root = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  user-select: none;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};

  input:disabled + span {
    opacity: ${({ theme }) => theme.opacity.disabled};
    cursor: not-allowed;
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
`;

const Track = styled.span`
  position: relative;
  flex: 0 0 auto;
  width: 46px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  transition: background ${({ theme }) => theme.transitions.normal},
    border-color ${({ theme }) => theme.transitions.normal};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.text};
    box-shadow: ${({ theme }) => theme.shadow.sm};
    transition: transform ${({ theme }) => theme.transitions.normal},
      background ${({ theme }) => theme.transitions.normal};
  }

  input:checked + & {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  input:checked + &::after {
    transform: translateX(20px);
    background: ${({ theme }) => theme.colors.onPrimary};
  }
  input:focus-visible + & {
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 25%, transparent);
  }
`;

interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className, ...rest }, ref) => (
    <Root className={className}>
      <HiddenInput ref={ref} type="checkbox" role="switch" {...rest} />
      <Track aria-hidden="true" />
      {label != null && <span>{label}</span>}
    </Root>
  ),
);

Switch.displayName = 'Switch';
