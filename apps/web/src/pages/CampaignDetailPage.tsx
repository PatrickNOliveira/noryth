import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Badge,
  Button,
  Divider,
  Loading,
  Alert,
} from '../components/ui';
import { BookIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCampaign, clearSelectedCampaign } from '../store/slices/campaigns.slice';
import { themeLabelKey, toneLabelKey } from '../utils/campaignOptions';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages';
import { media } from '../styles/media';

const Head = styled.header`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};

  ${media.tablet} {
    grid-template-columns: 200px 1fr;
  }
`;

const Cover = styled.div`
  position: relative;
  aspect-ratio: 3 / 4;
  max-width: 240px;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 60%, transparent);

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background: linear-gradient(90deg, color-mix(in srgb, ${({ theme }) => theme.colors.primary} 85%, black), ${({ theme }) => theme.colors.primary});
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Titles = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Name = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Short = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.xxl};
`;

const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const BackRow = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

export function CampaignDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedCampaign, loading, error } = useAppSelector((s) => s.campaigns);

  useEffect(() => {
    if (id) dispatch(fetchCampaign(id));
    return () => {
      dispatch(clearSelectedCampaign());
    };
  }, [id, dispatch]);

  if (loading && !selectedCampaign) {
    return <Loading block label={t('campaign.detail.loading')} />;
  }

  if (error && !selectedCampaign) {
    return (
      <>
        <BackRow>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            {t('campaign.detail.back')}
          </Button>
        </BackRow>
        <Alert variant="error">{t('campaign.detail.notFound')}</Alert>
      </>
    );
  }

  const c = selectedCampaign;
  if (!c) return null;

  const themeKey = themeLabelKey(c.theme);
  const toneKey = toneLabelKey(c.tone);
  const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === c.mainLanguage)?.label ?? c.mainLanguage;

  return (
    <>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          {t('campaign.detail.back')}
        </Button>
      </BackRow>

      <Head>
        <Cover>
          {c.coverImageUrl ? <img src={c.coverImageUrl} alt={c.name} /> : <BookIcon size={44} />}
        </Cover>
        <Titles>
          <Badges>
            <Badge $tone="primary">{themeKey ? t(themeKey) : c.theme}</Badge>
            <Badge $tone="accent">{toneKey ? t(toneKey) : c.tone}</Badge>
            <Badge $tone="neutral">{t(`campaign.status.${c.status}`)}</Badge>
            <Badge $tone="info">{t(`campaign.visibility.${c.visibility}`)}</Badge>
          </Badges>
          <Name>{c.name}</Name>
          <Short>{c.shortDescription}</Short>
          <Badges>
            <Badge $tone="neutral">{langLabel}</Badge>
            {c.maxPlayers != null && (
              <Badge $tone="neutral">
                {t('campaign.detail.maxPlayers', { max: c.maxPlayers })}
              </Badge>
            )}
          </Badges>
        </Titles>
      </Head>

      <Chapter>
        <ChapterHeading eyebrow={t('campaign.detail.premiseEyebrow')} title={t('campaign.detail.premiseTitle')} />
        <Prose>{c.premise}</Prose>
        <Divider variant="ornament" />
      </Chapter>
    </>
  );
}
