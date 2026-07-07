import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Portal } from './Portal';
import { IconButton } from './IconButton';
import { CloseIcon } from '../icons';
import { useOverlay } from '../../hooks/useOverlay';
import { fadeIn, fadeInScale } from '../../styles/animations';

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.overlay};
  backdrop-filter: blur(3px);
  animation: ${fadeIn} ${({ theme }) => theme.transitions.fast};
`;

const Panel = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  position: relative;
  width: 100%;
  max-width: ${({ $size }) =>
    $size === 'sm' ? '380px' : $size === 'lg' ? '760px' : '540px'};
  max-height: calc(100dvh - ${({ theme }) => theme.spacing.xxl});
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  animation: ${fadeInScale} ${({ theme }) => theme.transitions.normal};

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 70%, transparent),
      transparent
    );
  }
`;

const Head = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const Footer = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Centered dialog rendered in a portal. Closes on Escape or scrim click and
 * locks body scroll while open. Dressed as a page lifted from the book.
 */
export function Modal({ isOpen, onClose, title, size = 'md', footer, children }: ModalProps) {
  const { t } = useTranslation();
  useOverlay(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <Portal>
      <Scrim onClick={onClose}>
        <Panel
          $size={size}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <Head>
              <Title>{title}</Title>
              <IconButton
                label={t('common.close')}
                size="sm"
                variant="ghost"
                icon={<CloseIcon size={18} />}
                onClick={onClose}
              />
            </Head>
          )}
          {children}
          {footer && <Footer>{footer}</Footer>}
        </Panel>
      </Scrim>
    </Portal>
  );
}
