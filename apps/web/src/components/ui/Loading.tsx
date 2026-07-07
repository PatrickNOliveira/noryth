import styled from 'styled-components';
import { Spinner } from './Spinner';

const Root = styled.div<{ $block: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.primary};
  ${({ $block }) => $block && 'min-height: 40dvh;'}
`;

const Label = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface LoadingProps {
  label?: string;
  size?: number;
  /** Fill a large area (page/section) and center within it. */
  block?: boolean;
  className?: string;
}

/** Centered spinner with an optional caption, for pending regions. */
export function Loading({ label, size = 28, block = false, className }: LoadingProps) {
  return (
    <Root $block={block} className={className} role="status" aria-live="polite">
      <Spinner $size={size} />
      {label && <Label>{label}</Label>}
    </Root>
  );
}
