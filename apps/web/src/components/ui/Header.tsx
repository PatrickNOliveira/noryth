import React from 'react';
import styled from 'styled-components';
import { media } from '../../styles/media';

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.header};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  ${media.tablet} {
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  }
`;

const Side = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;

interface HeaderProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

/**
 * Sticky application top bar with left (brand/nav) and right (actions) slots.
 * Frosted parchment surface with a hairline base. Reused across every
 * authenticated screen.
 */
export function Header({ left, right, className }: HeaderProps) {
  return (
    <Bar className={className}>
      <Side>{left}</Side>
      <Side>{right}</Side>
    </Bar>
  );
}
