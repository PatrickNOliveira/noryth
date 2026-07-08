import React, { useEffect } from 'react';
import styled, { ThemeProvider, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChapterHeading,
  TomeCard,
  EntryList,
  Entry,
  Button,
  Badge,
  Divider,
} from '../components/ui';
import { CampaignVolume } from '../components/CampaignVolume';
import { withModuleAccent, ModuleAccent } from '../theme/themes';
import { PlusIcon, MapIcon, ShieldIcon, DiceIcon, BookIcon } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMyCampaigns,
  fetchPublicCampaigns,
} from '../store/slices/campaigns.slice';
import { media } from '../styles/media';

const Book = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxl};

  ${media.tablet} {
    gap: ${({ theme }) => theme.spacing.xxxl};
  }
`;

const Opening = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding-top: ${({ theme }) => theme.spacing.sm};
`;

const Kicker = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Welcome = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
  ${media.tablet} {
    font-size: ${({ theme }) => theme.typography.fontSize.hero};
  }
`;

const Opener = styled.p`
  max-width: 56ch;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const OpeningRule = styled(Divider)`
  max-width: 260px;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Blankleaf = styled.p`
  padding: ${({ theme }) => `${theme.spacing.lg} ${theme.spacing.md}`};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  text-align: center;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Shelf = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CTA = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const worldChapters: {
  module: ModuleAccent;
  icon: React.ReactNode;
  titleKey: string;
  metaKey: string;
}[] = [
  { module: 'atlas', icon: <MapIcon size={20} />, titleKey: 'dashboard.world.atlasTitle', metaKey: 'dashboard.world.atlasMeta' },
  { module: 'heraldry', icon: <ShieldIcon size={20} />, titleKey: 'dashboard.world.heraldryTitle', metaKey: 'dashboard.world.heraldryMeta' },
  { module: 'sheet', icon: <DiceIcon size={20} />, titleKey: 'dashboard.world.diaryTitle', metaKey: 'dashboard.world.diaryMeta' },
];

function WorldEntry({ module, icon, title, meta }: { module: ModuleAccent; icon: React.ReactNode; title: string; meta: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <ThemeProvider theme={withModuleAccent(theme, module)}>
      <Entry title={title} icon={icon} meta={meta} trailing={<Badge $tone="neutral">{t('common.soon')}</Badge>} />
    </ThemeProvider>
  );
}

/** The first page of the campaign book — now with the reader's real volumes. */
export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { myCampaigns, publicCampaigns } = useAppSelector((s) => s.campaigns);
  const firstName = user?.name?.split(' ')[0] ?? '';
  const hasCampaigns = myCampaigns.length > 0;

  useEffect(() => {
    dispatch(fetchMyCampaigns());
    dispatch(fetchPublicCampaigns());
  }, [dispatch]);

  const openCampaign = (id: string) => navigate(`/campaigns/${id}`);
  const startNew = () => navigate('/campaigns/new');

  // Discover: public campaigns the reader hasn't joined yet.
  const mineIds = new Set(myCampaigns.map((c) => c.id));
  const discover = publicCampaigns.filter((c) => !mineIds.has(c.id));

  return (
    <Book>
      <Opening>
        <Kicker>{t('dashboard.kicker')}</Kicker>
        <Welcome>
          {firstName ? t('dashboard.welcomeNamed', { name: firstName }) : t('dashboard.welcome')}
        </Welcome>
        <Opener>{t('dashboard.opener')}</Opener>
        <OpeningRule variant="ornament" />
      </Opening>

      <Chapter>
        <ChapterHeading numeral="I" eyebrow={t('dashboard.recent.eyebrow')} title={t('dashboard.recent.title')} />
        {hasCampaigns ? (
          <CampaignVolume campaign={myCampaigns[0]} onOpen={openCampaign} feature />
        ) : (
          <TomeCard
            variant="feature"
            kicker={t('dashboard.recent.tomeKicker')}
            title={t('dashboard.recent.tomeTitle')}
            subtitle={t('dashboard.recent.tomeSubtitle')}
            meta={
              <CTA>
                <Button leftIcon={<PlusIcon size={18} />} onClick={startNew}>
                  {t('dashboard.recent.cta')}
                </Button>
              </CTA>
            }
          >
            {t('dashboard.recent.tomeDescription')}
          </TomeCard>
        )}
      </Chapter>

      <Chapter>
        <ChapterHeading numeral="II" eyebrow={t('dashboard.campaigns.eyebrow')} title={t('dashboard.campaigns.title')} />
        {hasCampaigns ? (
          <>
            <Shelf>
              {myCampaigns.map((c) => (
                <CampaignVolume key={c.id} campaign={c} onOpen={openCampaign} />
              ))}
            </Shelf>
            <div>
              <Button variant="secondary" leftIcon={<PlusIcon size={18} />} onClick={startNew}>
                {t('dashboard.recent.cta')}
              </Button>
            </div>
          </>
        ) : (
          <Blankleaf>{t('dashboard.campaigns.empty')}</Blankleaf>
        )}
      </Chapter>

      <Chapter>
        <ChapterHeading
          eyebrow={t('dashboard.discover.eyebrow')}
          title={t('dashboard.discover.title')}
          lead={t('dashboard.discover.lead')}
        />
        {discover.length > 0 ? (
          <EntryList>
            {discover.map((c) => (
              <Entry
                key={c.id}
                title={c.name}
                icon={<BookIcon size={20} />}
                meta={c.shortDescription}
                trailing={
                  c.hasPassword ? (
                    <Badge $tone="warning">{t('dashboard.discover.locked')}</Badge>
                  ) : c.isFull ? (
                    <Badge $tone="neutral">{t('dashboard.discover.full')}</Badge>
                  ) : undefined
                }
                onClick={() => navigate(`/campaigns/${c.id}/join`)}
              />
            ))}
          </EntryList>
        ) : (
          <Blankleaf>{t('dashboard.discover.empty')}</Blankleaf>
        )}
      </Chapter>

      <Chapter>
        <ChapterHeading numeral="III" eyebrow={t('dashboard.characters.eyebrow')} title={t('dashboard.characters.title')} />
        <Blankleaf>{t('dashboard.characters.empty')}</Blankleaf>
      </Chapter>

      <Chapter>
        <ChapterHeading
          numeral="IV"
          eyebrow={t('dashboard.world.eyebrow')}
          title={t('dashboard.world.title')}
          lead={t('dashboard.world.lead')}
        />
        <EntryList>
          {worldChapters.map((c) => (
            <WorldEntry key={c.titleKey} module={c.module} icon={c.icon} title={t(c.titleKey)} meta={t(c.metaKey)} />
          ))}
        </EntryList>
      </Chapter>
    </Book>
  );
}
