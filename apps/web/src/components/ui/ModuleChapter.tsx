import React from 'react';
import styled, { ThemeProvider, useTheme } from 'styled-components';
import { ModuleAccent, withModuleAccent } from '../../theme/themes';
import { ChapterHeading } from './ChapterHeading';

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};

  & + & {
    margin-top: ${({ theme }) => theme.spacing.xxl};
  }
`;

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Motif = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 14%, ${({ theme }) => theme.colors.surfaceAlt});
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 30%, ${({ theme }) => theme.colors.border});
  color: ${({ theme }) => theme.colors.primary};
`;

interface ModuleChapterProps {
  /** Module sub-identity applied to this subtree's accent. */
  module: ModuleAccent;
  title: string;
  numeral?: string;
  eyebrow?: string;
  lead?: string;
  /** Small module emblem shown beside the chapter opener. */
  motif?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * A chapter that carries a module's own voice ("Livro de Heráldica",
 * "Atlas Cartográfico"…). Applies `withModuleAccent` through a nested
 * ThemeProvider so only `primary`/`accent` shift — every other token, and thus
 * the overall language, stays identical.
 */
export function ModuleChapter({
  module,
  title,
  numeral,
  eyebrow,
  lead,
  motif,
  children,
  className,
}: ModuleChapterProps) {
  const theme = useTheme();
  return (
    <ThemeProvider theme={withModuleAccent(theme, module)}>
      <Root className={className}>
        <HeadRow>
          {motif && <Motif aria-hidden="true">{motif}</Motif>}
          <ChapterHeading title={title} numeral={numeral} eyebrow={eyebrow} lead={lead} />
        </HeadRow>
        {children}
      </Root>
    </ThemeProvider>
  );
}
