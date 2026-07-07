import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui';
import { GlobeIcon } from './icons';
import { useLanguage } from '../hooks/useLanguage';
import { useDisclosure } from '../hooks/useDisclosure';
import { SupportedLanguage } from '../i18n/supportedLanguages';

/** Compact code shown on the trigger (region-forward so pt-BR ≠ pt-PT). */
const SHORT: Record<SupportedLanguage, string> = {
  'en-US': 'US',
  'en-GB': 'UK',
  'pt-BR': 'BR',
  'pt-PT': 'PT',
  'es-ES': 'ES',
  'fr-FR': 'FR',
  'it-IT': 'IT',
  'nl-NL': 'NL',
};

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
  min-height: 40px;
  padding: ${({ theme }) => `${theme.spacing.xxs} ${theme.spacing.sm}`};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 70%, transparent);
  color: ${({ theme }) => theme.colors.textMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Description = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
`;

const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  min-height: 48px;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background: ${({ theme, $active }) =>
    $active
      ? `color-mix(in srgb, ${theme.colors.primary} 12%, ${theme.colors.surface})`
      : 'transparent'};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  text-align: left;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Diamond = styled.span`
  width: 8px;
  height: 8px;
  transform: rotate(45deg);
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

/**
 * Language picker in the Noryth identity: a pill trigger that opens a modal
 * list of readable endonyms. Modal-based so it works comfortably with a thumb
 * on small screens — no native dropdown.
 */
export function LanguageSelector() {
  const { t } = useTranslation();
  const { language, languages, setLanguage } = useLanguage();
  const { isOpen, open, close } = useDisclosure();

  return (
    <>
      <Trigger type="button" onClick={open} aria-label={t('language.label')}>
        <GlobeIcon size={16} />
        {SHORT[language]}
      </Trigger>
      <Modal isOpen={isOpen} onClose={close} title={t('language.title')} size="sm">
        <Description>{t('language.description')}</Description>
        <List role="listbox" aria-label={t('language.label')}>
          {languages.map((l) => (
            <Option
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === language}
              $active={l.code === language}
              onClick={() => {
                setLanguage(l.code);
                close();
              }}
            >
              <span>{l.label}</span>
              {l.code === language && <Diamond aria-hidden="true" />}
            </Option>
          ))}
        </List>
      </Modal>
    </>
  );
}
