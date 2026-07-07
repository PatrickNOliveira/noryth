import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Portal } from './Portal';
import { Alert, AlertVariant } from './Alert';
import { fadeInUp } from '../../styles/animations';

/**
 * Toast system — UI infrastructure only (no business logic). Reuses the Alert
 * visual language so transient notifications match inline messages.
 */
export interface ToastOptions {
  title?: string;
  variant?: AlertVariant;
  /** Auto-dismiss delay in ms (default 4000). */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, 'title'>> {
  id: number;
  title?: string;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const Viewport = styled.div`
  position: fixed;
  left: 50%;
  bottom: ${({ theme }) => theme.spacing.lg};
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndex.toast};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  width: min(420px, calc(100vw - ${({ theme }) => theme.spacing.xl}));
`;

const Item = styled.div`
  animation: ${fadeInUp} ${({ theme }) => theme.transitions.normal};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  border-radius: ${({ theme }) => theme.radius.md};
`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = (seq.current += 1);
      const item: ToastItem = {
        id,
        message,
        title: options?.title,
        variant: options?.variant ?? 'info',
        duration: options?.duration ?? 4000,
      };
      setItems((current) => [...current, item]);
      window.setTimeout(() => dismiss(id), item.duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <Portal>
          <Viewport>
            {items.map((t) => (
              <Item key={t.id}>
                <Alert variant={t.variant} title={t.title} onClose={() => dismiss(t.id)}>
                  {t.message}
                </Alert>
              </Item>
            ))}
          </Viewport>
        </Portal>
      )}
    </ToastContext.Provider>
  );
}

/** Access the toast dispatcher. Throws if used outside ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de um <ToastProvider>');
  }
  return ctx;
}
