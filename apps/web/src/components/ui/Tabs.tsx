import React, { useState } from 'react';
import styled from 'styled-components';

const List = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textMuted)};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  &::after {
    content: '';
    position: absolute;
    left: ${({ theme }) => theme.spacing.sm};
    right: ${({ theme }) => theme.spacing.sm};
    bottom: -1px;
    height: 2px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.primary};
    transform: scaleX(${({ $active }) => ($active ? 1 : 0)});
    transition: transform ${({ theme }) => theme.transitions.normal};
  }
`;

const Panel = styled.div`
  padding-top: ${({ theme }) => theme.spacing.lg};
`;

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
}

/** Uncontrolled tab strip with an animated bronze underline. */
export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={className}>
      <List role="tablist">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === active}
            $active={tab.id === active}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </Tab>
        ))}
      </List>
      <Panel role="tabpanel">{current?.content}</Panel>
    </div>
  );
}
