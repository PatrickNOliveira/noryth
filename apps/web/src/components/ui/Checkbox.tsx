import React, { forwardRef } from 'react';
import styled from 'styled-components';

const Root = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
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

const Box = styled.span`
  position: relative;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  transition: border-color ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  /* Ink check-mark, drawn in CSS. */
  &::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid ${({ theme }) => theme.colors.onPrimary};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0);
    transition: transform ${({ theme }) => theme.transitions.fast};
  }

  input:checked + & {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  input:checked + &::after {
    transform: rotate(45deg) scale(1);
  }
  input:focus-visible + & {
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 25%, transparent);
  }
`;

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...rest }, ref) => (
    <Root className={className}>
      <HiddenInput ref={ref} type="checkbox" {...rest} />
      <Box aria-hidden="true" />
      {label != null && <span>{label}</span>}
    </Root>
  ),
);

Checkbox.displayName = 'Checkbox';
