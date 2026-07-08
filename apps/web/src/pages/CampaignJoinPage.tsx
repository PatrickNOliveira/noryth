import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Alert,
  Badge,
  Button,
  ChapterHeading,
  FormField,
  Input,
  Loading,
} from '../components/ui';
import { BookIcon } from '../components/icons';
import { useAppDispatch } from '../store/hooks';
import { joinCampaign } from '../store/slices/participants.slice';
import { fetchMyCampaigns } from '../store/slices/campaigns.slice';
import { campaignService } from '../services/campaign.service';
import { CampaignSummary } from '../types/campaign';
import { ApiError } from '../services/api';
import { themeLabelKey } from '../utils/campaignOptions';
import { media } from '../styles/media';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const BackRow = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const Card = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};

  ${media.tablet} {
    grid-template-columns: 160px 1fr;
  }
`;

const Cover = styled.div`
  aspect-ratio: 3 / 4;
  max-width: 200px;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 60%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  min-width: 0;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Name = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text};
`;

const Short = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  max-width: 360px;
`;

export function CampaignJoinPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    campaignService
      .getSummary(id)
      .then((s) => {
        if (active) setSummary(s);
      })
      .catch((err: ApiError) => {
        if (active) setLoadError(err?.message ?? t('campaign.join.notFound'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, t]);

  const open = () => navigate(`/campaigns/${id}`);

  const submit = () => {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    dispatch(joinCampaign({ campaignId: id, password: password || undefined }))
      .unwrap()
      .then(async () => {
        await dispatch(fetchMyCampaigns());
        navigate(`/campaigns/${id}`);
      })
      .catch((err: ApiError) => {
        setJoinError(err?.message ?? t('campaign.join.error'));
      })
      .finally(() => setJoining(false));
  };

  if (loading) {
    return <Loading block label={t('campaign.join.loading')} />;
  }

  if (loadError || !summary) {
    return (
      <Page>
        <BackRow>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            {t('campaign.join.back')}
          </Button>
        </BackRow>
        <Alert variant="error">{loadError ?? t('campaign.join.notFound')}</Alert>
      </Page>
    );
  }

  const themeKey = themeLabelKey(summary.theme);
  const alreadyIn = summary.isParticipant;
  const full = summary.isFull && !alreadyIn;

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          {t('campaign.join.back')}
        </Button>
      </BackRow>

      <ChapterHeading
        eyebrow={t('campaign.join.eyebrow')}
        title={t('campaign.join.title')}
      />

      <Card>
        <Cover>
          {summary.coverImageUrl ? (
            <img src={summary.coverImageUrl} alt={summary.name} />
          ) : (
            <BookIcon size={40} />
          )}
        </Cover>
        <Body>
          <Badges>
            <Badge $tone="primary">
              {themeKey ? t(themeKey) : summary.theme}
            </Badge>
            {summary.maxPlayers != null && (
              <Badge $tone="neutral">
                {t('campaign.join.players', {
                  current: summary.playerCount,
                  max: summary.maxPlayers,
                })}
              </Badge>
            )}
            {summary.hasPassword && (
              <Badge $tone="warning">{t('campaign.join.protected')}</Badge>
            )}
          </Badges>
          <Name>{summary.name}</Name>
          <Short>{summary.shortDescription}</Short>

          {alreadyIn ? (
            <div>
              <Button onClick={open}>{t('campaign.join.open')}</Button>
            </div>
          ) : full ? (
            <Alert variant="warning">{t('campaign.join.full')}</Alert>
          ) : (
            <Form>
              {joinError && <Alert variant="error">{joinError}</Alert>}
              {summary.hasPassword && (
                <FormField label={t('campaign.join.passwordLabel')}>
                  {(p) => (
                    <Input
                      {...p}
                      type="password"
                      value={password}
                      placeholder={t('campaign.join.passwordPlaceholder')}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </FormField>
              )}
              <div>
                <Button
                  onClick={submit}
                  loading={joining}
                  disabled={summary.hasPassword && password.length === 0}
                >
                  {t('campaign.join.cta')}
                </Button>
              </div>
            </Form>
          )}
        </Body>
      </Card>
    </Page>
  );
}
