import styled from 'styled-components';
import { media } from '../../styles/media';

/**
 * Constrains page content to a comfortable reading measure and provides
 * consistent, generous padding. Every screen's body sits inside one of these
 * so spacing stays uniform across the whole app.
 */
export const PageContainer = styled.div<{ $width?: 'narrow' | 'default' | 'wide' }>`
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
  max-width: ${({ $width = 'default' }) =>
    $width === 'narrow' ? '520px' : $width === 'wide' ? '1080px' : '760px'};

  ${media.tablet} {
    padding: ${({ theme }) => `${theme.spacing.xl} ${theme.spacing.xl}`};
  }
`;
