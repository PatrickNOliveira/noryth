import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '../components/BrandMark';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { CompassIcon } from '../components/icons';
import { media } from '../styles/media';
import { fadeIn, fadeInUp } from '../styles/animations';

const Screen = styled.main`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;

  ${media.desktop} {
    display: grid;
    grid-template-columns: 1.05fr 1fr;
  }
`;

/**
 * Branding side, dressed as the cover of a closed tome. On mobile it is a
 * compact cover above the form; on desktop it fills an immersive panel with a
 * faint cartographic wash — all pure CSS.
 */
const Brand = styled.aside`
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spacing.xl} ${theme.spacing.lg} ${theme.spacing.lg}`};
  background:
    radial-gradient(
      80% 60% at 50% 32%,
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent),
      transparent 60%
    ),
    ${({ theme }) => theme.colors.backgroundAlt};

  ${media.desktop} {
    padding: ${({ theme }) => theme.spacing.xxl};
    border-right: 1px solid ${({ theme }) => theme.colors.border};
  }

  /* Faint concentric "map" rings — cartography, CSS only. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-radial-gradient(
      circle at 50% 40%,
      transparent 0,
      transparent 46px,
      color-mix(in srgb, ${({ theme }) => theme.colors.borderStrong} 28%, transparent) 47px,
      transparent 48px
    );
    opacity: ${({ theme }) => theme.opacity.faint};
    pointer-events: none;
    mask-image: radial-gradient(70% 60% at 50% 40%, #000, transparent 75%);
  }
`;

/** The embossed cover plate: a double-ruled frame with corner marks. */
const Cover = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  width: 100%;
  max-width: 380px;
  padding: ${({ theme }) => `${theme.spacing.xl} ${theme.spacing.lg}`};
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.sm};
  /* Inner rule — a printed plate frame. */
  box-shadow:
    inset 0 0 0 4px ${({ theme }) => theme.colors.backgroundAlt},
    inset 0 0 0 5px color-mix(in srgb, ${({ theme }) => theme.colors.borderStrong} 70%, transparent);
  animation: ${fadeIn} ${({ theme }) => theme.transitions.slow};

  ${media.desktop} {
    padding: ${({ theme }) => `${theme.spacing.xxl} ${theme.spacing.xl}`};
  }

  /* Corner marks on the diagonal. */
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: ${({ theme }) => theme.colors.primary};
    transform: rotate(45deg);
  }
  &::before {
    top: 9px;
    left: 9px;
  }
  &::after {
    bottom: 9px;
    right: 9px;
  }
`;

const Emblem = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.9;
`;

const Plate = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Rule = styled.span`
  width: 64px;
  height: 1px;
  background: ${({ theme }) => theme.colors.borderStrong};
`;

const Tagline = styled.p`
  max-width: 30ch;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Volume = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: 0.7rem;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const FormSide = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.lg};

  ${media.desktop} {
    justify-content: center;
    padding: ${({ theme }) => theme.spacing.xxl};
  }
`;

const TopBar = styled.header`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  z-index: 2;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FormWrap = styled.div`
  width: 100%;
  max-width: 400px;
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
  animation: ${fadeInUp} ${({ theme }) => theme.transitions.slow};
`;

/**
 * Immersive shell for login/register: a closed tome cover beside the form.
 * The user is not opening an app — they are opening their campaign book.
 * Presentation only; no auth logic lives here.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Screen>
      <Brand>
        <Cover>
          <Emblem>
            <CompassIcon size={30} />
          </Emblem>
          <Plate>{t('auth.cover.plate')}</Plate>
          <BrandMark size="hero" />
          <Rule aria-hidden="true" />
          <Tagline>{t('auth.cover.tagline')}</Tagline>
          <Volume>{t('auth.cover.volume')}</Volume>
        </Cover>
      </Brand>

      <FormSide>
        <TopBar>
          <LanguageSelector />
          <ThemeToggle />
        </TopBar>
        <FormWrap>{children}</FormWrap>
      </FormSide>
    </Screen>
  );
}
