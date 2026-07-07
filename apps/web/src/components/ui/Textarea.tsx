import styled from 'styled-components';
import { fieldBase } from './fieldBase';

/** Multi-line input for descriptions, notes and lore. */
export const Textarea = styled.textarea`
  ${fieldBase}
  min-height: 120px;
  padding: ${({ theme }) => theme.spacing.md};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  resize: vertical;
`;
