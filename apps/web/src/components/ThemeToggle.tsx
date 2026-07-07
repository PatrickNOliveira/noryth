import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../hooks/useThemeMode';
import { MoonIcon, SunIcon } from './icons';
import { media } from '../styles/media';

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  min-height: 40px;
  padding: ${({ theme }) => `${theme.spacing.xxs} ${theme.spacing.sm}`};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 70%, transparent);
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  svg {
    transition: transform ${({ theme }) => theme.transitions.normal};
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text};
  }
  &:hover svg {
    transform: rotate(-12deg) scale(1.05);
  }
`;

/** Keep the toggle compact on the smallest screens (icon only). */
const Label = styled.span`
  display: none;
  ${media.sm} {
    display: inline;
  }
`;

/** Small control that flips between light and dark themes. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, toggle } = useThemeMode();
  return (
    <ToggleButton type="button" onClick={toggle} aria-label={t('theme.toggle')}>
      {mode === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      <Label>{mode === 'dark' ? t('theme.dark') : t('theme.light')}</Label>
    </ToggleButton>
  );
}
