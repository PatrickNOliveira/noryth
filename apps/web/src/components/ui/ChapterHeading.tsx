import React from 'react';
import styled from 'styled-components';
import { media } from '../../styles/media';

const Root = styled.header`
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: ${({ theme }) => theme.spacing.md};
  row-gap: ${({ theme }) => theme.spacing.xxs};
`;

/** Large faded drop-figure numeral in the margin, like an illuminated capital. */
const Numeral = styled.span`
  grid-row: 1 / span 2;
  align-self: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-size: 2.6rem;
  line-height: 1;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 55%, transparent);
  ${media.tablet} {
    font-size: 3.2rem;
  }
`;

const Eyebrow = styled.span`
  grid-column: 2;
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h2`
  grid-column: 2;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
`;

const Lead = styled.p`
  grid-column: 2;
  max-width: 54ch;
  margin-top: ${({ theme }) => theme.spacing.xxs};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Rule = styled.span`
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.primary};

  &::before {
    content: '';
    width: 42px;
    height: 1px;
    background: ${({ theme }) => theme.colors.primary};
  }
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to right,
      color-mix(in srgb, ${({ theme }) => theme.colors.borderStrong} 80%, transparent),
      transparent
    );
  }
`;

const Diamond = styled.span`
  width: 6px;
  height: 6px;
  transform: rotate(45deg);
  background: ${({ theme }) => theme.colors.primary};
`;

interface ChapterHeadingProps {
  title: string;
  /** Illuminated margin numeral, e.g. "I", "II". */
  numeral?: string;
  /** Small chapter caption above the title. */
  eyebrow?: string;
  /** Italic lead line, like an opening sentence. */
  lead?: string;
  className?: string;
}

/**
 * A chapter opener — the way a page announces a new section of the book.
 * Replaces the generic admin "section header". Optional illuminated numeral in
 * the margin, serif title, italic lead and an ornamental rule.
 */
export function ChapterHeading({
  title,
  numeral,
  eyebrow,
  lead,
  className,
}: ChapterHeadingProps) {
  return (
    <Root className={className}>
      {numeral && <Numeral aria-hidden="true">{numeral}</Numeral>}
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Title>{title}</Title>
      {lead && <Lead>{lead}</Lead>}
      <Rule aria-hidden="true">
        <Diamond />
      </Rule>
    </Root>
  );
}
