import React from 'react';
import styled from 'styled-components';
import { Divider } from './Divider';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => `${theme.spacing.xl} ${theme.spacing.md}`};
  text-align: center;
`;

const IconWrap = styled.div`
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.9;
`;

const Title = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  max-width: 42ch;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const OrnamentWrap = styled.div`
  max-width: 200px;
`;

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The recurring "nothing here yet" moment — an empty stable, an unwritten
 * chapter. Dressed as a small illuminated page, never a bare admin table.
 */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <Root className={className}>
      {icon && <IconWrap>{icon}</IconWrap>}
      <Title>{title}</Title>
      <OrnamentWrap>
        <Divider variant="ornament" />
      </OrnamentWrap>
      {description && <Description>{description}</Description>}
      {actions && <Actions>{actions}</Actions>}
    </Root>
  );
}
