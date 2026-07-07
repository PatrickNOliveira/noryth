import React, { useRef } from 'react';
import styled from 'styled-components';
import { useDisclosure } from '../../hooks/useDisclosure';
import { useClickOutside } from '../../hooks/useClickOutside';
import { fadeInScale } from '../../styles/animations';

const Root = styled.div`
  position: relative;
  display: inline-flex;
`;

const Menu = styled.div<{ $align: 'start' | 'end' }>`
  position: absolute;
  top: calc(100% + 6px);
  ${({ $align }) => ($align === 'end' ? 'right: 0;' : 'left: 0;')}
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  min-width: 200px;
  padding: ${({ theme }) => theme.spacing.xxs};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  animation: ${fadeInScale} ${({ theme }) => theme.transitions.fast};
  transform-origin: top;
`;

const ItemButton = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme, $danger }) => ($danger ? theme.colors.danger : theme.colors.text)};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, transparent);
  }
`;

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownProps {
  /** Render-prop for the trigger; receives an onClick to toggle the menu. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Click-to-open menu anchored to a trigger. Closes on outside click / item
 * select. Used for card overflow menus, account menus, etc.
 */
export function Dropdown({ trigger, items, align = 'end', className }: DropdownProps) {
  const { isOpen, toggle, close } = useDisclosure();
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, close, isOpen);

  return (
    <Root ref={rootRef} className={className}>
      {trigger({ onClick: toggle, 'aria-expanded': isOpen })}
      {isOpen && (
        <Menu $align={align} role="menu">
          {items.map((item) => (
            <ItemButton
              key={item.label}
              type="button"
              role="menuitem"
              $danger={item.danger}
              onClick={() => {
                item.onClick();
                close();
              }}
            >
              {item.icon}
              {item.label}
            </ItemButton>
          ))}
        </Menu>
      )}
    </Root>
  );
}
