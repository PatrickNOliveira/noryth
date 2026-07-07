import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Portal } from './Portal';
import { IconButton } from './IconButton';
import { CloseIcon } from '../icons';
import { useOverlay } from '../../hooks/useOverlay';
import { fadeIn } from '../../styles/animations';

export type DrawerSide = 'right' | 'left' | 'bottom';

const slideIn = {
  right: keyframes`from { transform: translateX(100%); } to { transform: translateX(0); }`,
  left: keyframes`from { transform: translateX(-100%); } to { transform: translateX(0); }`,
  bottom: keyframes`from { transform: translateY(100%); } to { transform: translateY(0); }`,
};

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.drawer};
  background: ${({ theme }) => theme.colors.overlay};
  backdrop-filter: blur(2px);
  animation: ${fadeIn} ${({ theme }) => theme.transitions.fast};
`;

const Panel = styled.aside<{ $side: DrawerSide }>`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.drawer};
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  animation: ${({ $side }: { $side: DrawerSide }) => slideIn[$side]} ${({ theme }) => theme.transitions.normal};

  ${({ $side, theme }) =>
    $side === 'bottom'
      ? css`
          left: 0;
          right: 0;
          bottom: 0;
          max-height: 85dvh;
          border-top: 1px solid ${theme.colors.border};
          border-radius: ${theme.radius.lg} ${theme.radius.lg} 0 0;
        `
      : css`
          top: 0;
          bottom: 0;
          width: min(400px, 90vw);
          ${$side}: 0;
          border-${$side === 'right' ? 'left' : 'right'}: 1px solid ${theme.colors.border};
        `}
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: string;
  children?: React.ReactNode;
}

/**
 * Sliding panel from an edge — mobile-first navigation, filters, quick forms.
 * Bottom sheet is the natural pattern on phones.
 */
export function Drawer({ isOpen, onClose, side = 'right', title, children }: DrawerProps) {
  const { t } = useTranslation();
  useOverlay(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <Portal>
      <Scrim onClick={onClose} />
      <Panel $side={side} role="dialog" aria-modal="true" aria-label={title}>
        <Head>
          {title && <Title>{title}</Title>}
          <IconButton
            label={t('common.close')}
            size="sm"
            variant="ghost"
            icon={<CloseIcon size={18} />}
            onClick={onClose}
          />
        </Head>
        <Body>{children}</Body>
      </Panel>
    </Portal>
  );
}
