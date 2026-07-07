import styled from 'styled-components';
import { fieldBase } from './fieldBase';

/**
 * Raw text input. Pairs with FormField for label/error. Set
 * `aria-invalid` to render the error state.
 */
export const Input = styled.input`
  ${fieldBase}
`;
