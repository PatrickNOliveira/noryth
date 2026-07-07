import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { fieldBase } from './fieldBase';

const Wrap = styled.div`
  position: relative;
  width: 100%;
`;

const StyledSelect = styled.select`
  ${fieldBase}
  padding-right: ${({ theme }) => theme.spacing.xl};
  cursor: pointer;

  /* Style the option list where the browser allows it. */
  option {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }
`;

/** Chevron rendered as CSS so it inherits the theme color. */
const Chevron = styled.span`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.spacing.md};
  width: 8px;
  height: 8px;
  border-right: 1.5px solid ${({ theme }) => theme.colors.textMuted};
  border-bottom: 1.5px solid ${({ theme }) => theme.colors.textMuted};
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
`;

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Native select dressed in the book identity, with a custom chevron. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, ...rest }, ref) => (
    <Wrap>
      <StyledSelect ref={ref} {...rest}>
        {children}
      </StyledSelect>
      <Chevron aria-hidden="true" />
    </Wrap>
  ),
);

Select.displayName = 'Select';
