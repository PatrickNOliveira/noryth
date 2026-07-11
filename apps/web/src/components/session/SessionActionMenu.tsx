import { ReactNode } from 'react';
import styled from 'styled-components';

/**
 * The session action menu. Actions are mocked in this story — they render as
 * tappable items (icon + short label) and call `onAction`. Two orientations:
 * a vertical rail on desktop and a horizontally-scrolling bar on mobile.
 */
export interface SessionAction {
  key: string;
  label: string;
  icon: ReactNode;
}

const List = styled.div<{ $orientation: 'vertical' | 'horizontal' }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  ${({ $orientation }) =>
    $orientation === 'vertical'
      ? `
    flex-direction: column;
    overflow-y: auto;
  `
      : `
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
  `}
`;

const Item = styled.button<{ $orientation: 'vertical' | 'horizontal' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: ${({ $orientation }) => ($orientation === 'horizontal' ? '0 0 auto' : '0 0 auto')};
  ${({ $orientation }) => $orientation === 'horizontal' && 'flex-direction: column;'}
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  white-space: nowrap;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }

  svg {
    flex-shrink: 0;
  }
`;

interface SessionActionMenuProps {
  actions: SessionAction[];
  orientation: 'vertical' | 'horizontal';
  onAction: (key: string) => void;
}

export function SessionActionMenu({
  actions,
  orientation,
  onAction,
}: SessionActionMenuProps) {
  return (
    <List $orientation={orientation}>
      {actions.map((a) => (
        <Item
          key={a.key}
          type="button"
          $orientation={orientation}
          onClick={() => onAction(a.key)}
        >
          {a.icon}
          <span>{a.label}</span>
        </Item>
      ))}
    </List>
  );
}
