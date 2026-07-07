import React from 'react';
import styled from 'styled-components';

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};

  & + & {
    margin-top: ${({ theme }) => theme.spacing.xxl};
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Titles = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
`;

const Eyebrow = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

interface SectionProps {
  title?: string;
  /** Small uppercase caption above the title, like a chapter marker. */
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * A titled content block — the way a page is divided into chapters ("Suas
 * Mesas", "Personagens"…). Title in the book serif, optional chapter eyebrow
 * and a trailing action slot.
 */
export function Section({
  title,
  eyebrow,
  description,
  action,
  children,
  className,
}: SectionProps) {
  return (
    <Root className={className}>
      {(title || action) && (
        <Head>
          <Titles>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && <Title>{title}</Title>}
            {description && <Description>{description}</Description>}
          </Titles>
          {action}
        </Head>
      )}
      {children}
    </Root>
  );
}
