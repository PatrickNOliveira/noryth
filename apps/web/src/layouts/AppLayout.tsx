import styled from 'styled-components';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { Button, Header } from '../components/ui';
import { LeaveIcon } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import { media } from '../styles/media';
import { fadeInUp } from '../styles/animations';

const Shell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
`;

const Brand = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};

  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/** Hide the "Sair" label on the smallest screens; keep the icon tappable. */
const LogoutLabel = styled.span`
  display: none;
  ${media.sm} {
    display: inline;
  }
`;

const Content = styled.main`
  flex: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
  animation: ${fadeInUp} ${({ theme }) => theme.transitions.slow};

  ${media.tablet} {
    padding: ${({ theme }) => theme.spacing.xl};
  }
`;

/** Authenticated shell: sticky header with brand, language, theme and logout. */
export function AppLayout() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  return (
    <Shell>
      <Header
        left={
          <Brand>
            Nor<span>y</span>th
          </Brand>
        }
        right={
          <>
            <LanguageSelector />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              leftIcon={<LeaveIcon size={16} />}
            >
              <LogoutLabel>{t('app.logout')}</LogoutLabel>
            </Button>
          </>
        }
      />
      <Content>
        <Outlet />
      </Content>
    </Shell>
  );
}
