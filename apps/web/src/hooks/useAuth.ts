import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '../contexts/AuthContext';

/** Access the authentication context; throws if used outside AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um <AuthProvider>');
  }
  return context;
}
