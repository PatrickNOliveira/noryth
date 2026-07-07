import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageProvider';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui';
import { AppRoutes } from './routes/AppRoutes';

/**
 * Provider composition. Order: language (resolves i18n from persisted state) →
 * theme → toast (UI feedback) → auth → router → routes. All sit inside the
 * Redux Provider + PersistGate mounted in index.tsx.
 */
export default function App() {
  return (
    <LanguageProvider>
      <AppThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </AppThemeProvider>
    </LanguageProvider>
  );
}
