import React from 'react';
import styled, { css } from 'styled-components';
import { ChevronDownIcon } from '../icons';

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div<{ $interactive: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xs}`};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      transition: background ${({ theme }) => theme.transitions.fast};
      border-radius: ${({ theme }) => theme.radius.sm};
      &:hover {
        background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 7%, transparent);
      }
      &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: -2px;
      }
    `}
`;

/** Margin index — a small roman/arabic figure like a ledger line number. */
const Index = styled.span`
  min-width: 1.6em;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 70%, ${({ theme }) => theme.colors.textMuted});
  text-align: center;
`;

const IconSlot = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.primary};
`;

const Body = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const Title = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MetaText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Trailing = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.textMuted};

  svg {
    transform: rotate(-90deg);
  }
`;

export interface EntryProps {
  title: string;
  /** Margin figure (line number / roman numeral). */
  index?: string | number;
  icon?: React.ReactNode;
  meta?: string;
  /** Trailing content (badge, date). Rendered before the chevron. */
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** A single line in a register — the ledger row of the campaign book. */
export function Entry({ title, index, icon, meta, trailing, onClick, className }: EntryProps) {
  const interactive = !!onClick;
  return (
    <Row
      $interactive={interactive}
      className={className}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {index != null ? <Index aria-hidden="true">{index}</Index> : icon ? <IconSlot>{icon}</IconSlot> : <span />}
      <Body>
        <Title>{title}</Title>
        {meta && <MetaText>{meta}</MetaText>}
      </Body>
      <Trailing>
        {trailing}
        {interactive && <ChevronDownIcon size={16} />}
      </Trailing>
    </Row>
  );
}

/**
 * A register — the ledger/table-of-contents of the book. Entries separated by
 * hairlines, with margin figures instead of an admin table's rows.
 */
export function EntryList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <List role="list" className={className}>
      {children}
    </List>
  );
}
