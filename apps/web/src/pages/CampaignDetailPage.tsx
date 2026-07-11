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
  EntryList,
  Entry,
  useToast,
} from '../components/ui';
import { BookIcon, ShieldIcon, DiceIcon, CompassIcon, MapIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCampaign, clearSelectedCampaign } from '../store/slices/campaigns.slice';
import {
  fetchAttributes,
  clearAttributes,
} from '../store/slices/campaignAttributes.slice';
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

/** Copies text to the clipboard with a fallback for insecure contexts. */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

export function CampaignDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedCampaign, loading, error } = useAppSelector((s) => s.campaigns);
  const attributes = useAppSelector((s) => s.campaignAttributes.list);
  const myId = useAppSelector((s) => s.auth.user?.id);
  const { notify } = useToast();

  const share = async (campaignId: string) => {
    const link = `${window.location.origin}/campaigns/${campaignId}/join`;
    try {
      await copyToClipboard(link);
      notify(t('campaign.share.copied'), { variant: 'success' });
    } catch {
      notify(t('campaign.share.error'), { variant: 'error' });
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchCampaign(id));
      dispatch(fetchAttributes(id));
    }
    return () => {
      dispatch(clearSelectedCampaign());
      dispatch(clearAttributes());
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

  const isMaster = !!myId && c.masterId === myId;
  const attrCount = attributes.filter((a) => a.campaignId === c.id).length;
  const themeKey = themeLabelKey(c.theme);
  const toneKey = toneLabelKey(c.tone);
  const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === c.mainLanguage)?.label ?? c.mainLanguage;

  return (
    <>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          {t('campaign.detail.back')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => share(c.id)}>
          {t('campaign.share.cta')}
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
      </Chapter>

      {isMaster && (
        <Chapter>
          <ChapterHeading
            eyebrow={t('campaign.sheet.eyebrow')}
            title={t('campaign.sheet.title')}
          />
          <EntryList>
            <Entry
              title={t('campaign.attributes.title')}
              icon={<DiceIcon size={20} />}
              meta={t('campaign.attributes.lead')}
              trailing={
                attrCount > 0 ? (
                  <Badge $tone="neutral">
                    {t('campaign.attributes.configured', { count: attrCount })}
                  </Badge>
                ) : undefined
              }
              onClick={() => navigate(`/campaigns/${c.id}/attributes`)}
            />
          </EntryList>
          <Divider variant="ornament" />
        </Chapter>
      )}

      <Chapter>
        <ChapterHeading
          eyebrow={t('campaign.session.eyebrow')}
          title={t('campaign.session.title')}
        />
        <EntryList>
          <Entry
            title={t('playerCharacter.hubTitle')}
            icon={<CompassIcon size={20} />}
            meta={t('playerCharacter.hubMeta')}
            onClick={() => navigate(`/campaigns/${c.id}/my-character`)}
          />
          <Entry
            title={t('participant.title')}
            icon={<CompassIcon size={20} />}
            meta={t('participant.hubMeta')}
            onClick={() => navigate(`/campaigns/${c.id}/participants`)}
          />
        </EntryList>
        <Divider variant="ornament" />
      </Chapter>

      <Chapter>
        <ChapterHeading eyebrow={t('dashboard.world.eyebrow')} title={t('dashboard.world.title')} />
        <EntryList>
          <Entry
            title={t('faction.list.title')}
            icon={<ShieldIcon size={20} />}
            meta={t('faction.list.lead')}
            onClick={() => navigate(`/campaigns/${c.id}/factions`)}
          />
          <Entry
            title={t('character.list.title')}
            icon={<CompassIcon size={20} />}
            meta={t('character.hubMeta')}
            onClick={() => navigate(`/campaigns/${c.id}/characters`)}
          />
          <Entry
            title={t('map.list.title')}
            icon={<MapIcon size={20} />}
            meta={t('map.hubMeta')}
            onClick={() => navigate(`/campaigns/${c.id}/maps`)}
          />
          <Entry
            title={t('item.list.title')}
            icon={<BookIcon size={20} />}
            meta={t('item.hubMeta')}
            onClick={() => navigate(`/campaigns/${c.id}/items`)}
          />
        </EntryList>
        <Divider variant="ornament" />
      </Chapter>
    </>
  );
}
