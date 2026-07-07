import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDownIcon } from '../icons';

const Root = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

const ItemRoot = styled.div`
  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const Trigger = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.md}`};
  background: ${({ theme, $open }) =>
    $open
      ? `color-mix(in srgb, ${theme.colors.primary} 6%, ${theme.colors.surface})`
      : theme.colors.surface};
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  transition: background ${({ theme }) => theme.transitions.fast};

  svg {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.textMuted};
    transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
    transition: transform ${({ theme }) => theme.transitions.normal};
  }

  &:hover {
    background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 8%, ${({ theme }) => theme.colors.surface});
  }
`;

const Content = styled.div`
  padding: ${({ theme }) => `0 ${theme.spacing.md} ${theme.spacing.md}`};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Allow multiple panels open at once (default: single). */
  multiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

/** Collapsible list — session logs, lore entries, FAQ-style content. */
export function Accordion({ items, multiple = false, defaultOpen = [], className }: AccordionProps) {
  const [open, setOpen] = useState<string[]>(defaultOpen);

  const toggle = (id: string) =>
    setOpen((current) => {
      if (current.includes(id)) return current.filter((i) => i !== id);
      return multiple ? [...current, id] : [id];
    });

  return (
    <Root className={className}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <ItemRoot key={item.id}>
            <Trigger
              type="button"
              $open={isOpen}
              aria-expanded={isOpen}
              onClick={() => toggle(item.id)}
            >
              {item.title}
              <ChevronDownIcon size={18} />
            </Trigger>
            {isOpen && <Content>{item.content}</Content>}
          </ItemRoot>
        );
      })}
    </Root>
  );
}
