import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Screen = styled.div`
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background};
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.pill};
  animation: ${spin} 0.8s linear infinite;
`;

/** Blocking loader shown while the app validates a persisted session. */
export function FullScreenLoader() {
  return (
    <Screen>
      <Spinner aria-label="Carregando" />
    </Screen>
  );
}
