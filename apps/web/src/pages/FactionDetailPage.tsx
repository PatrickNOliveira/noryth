import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Card,
  Badge,
  BadgeTone,
  Button,
  Textarea,
  Divider,
  Loading,
  Alert,
} from '../components/ui';
import { ShieldIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchFaction,
  approveFaction,
  rejectFaction,
  regenerateFaction,
  clearSelectedFaction,
} from '../store/slices/factions.slice';
import { factionTypeLabelKey } from '../utils/factionOptions';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { realtime, FACTION_IMAGE_EVENTS } from '../services/realtime';
import { Faction, FactionStatus } from '../types/faction';
import { media } from '../styles/media';

/** Optional, gentle safety net in case a realtime event is missed. */
const FALLBACK_POLL_MS = 20000;

const statusTone: Record<FactionStatus, BadgeTone> = {
  draft: 'neutral',
  generating_symbol: 'info',
  pending_approval: 'warning',
  active: 'success',
  generation_failed: 'danger',
  archived: 'neutral',
};

/** The image URL currently worth showing, if any. */
function displayImageUrl(f: Faction): string | null {
  if (f.approvedImageUrl) return f.approvedImageUrl;
  if (f.currentImage?.status === 'completed') return f.currentImage.imageUrl;
  return null;
}

const BackRow = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Head = styled.header`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  ${media.tablet} {
    grid-template-columns: 220px 1fr;
  }
`;

const Crest = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  max-width: 260px;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, ${({ theme }) => theme.colors.surfaceAlt});
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.primary};
  img { width: 100%; height: 100%; object-fit: cover; }
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

const Motto = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  color: ${({ theme }) => theme.colors.accent};
`;

const Lead = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const AdjustBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Forge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xl} 0;
  text-align: center;
`;

export function FactionDetailPage() {
  const { t } = useTranslation();
  const { campaignId = '', factionId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error } = useAppSelector((s) => s.factions);
  const isMaster = useIsCampaignMaster(campaignId);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (campaignId && factionId) dispatch(fetchFaction({ campaignId, factionId }));
    return () => {
      dispatch(clearSelectedFaction());
    };
  }, [campaignId, factionId, dispatch]);

  // Realtime: join the faction room and refresh once on each event — no loop.
  useEffect(() => {
    if (!campaignId || !factionId) return;
    const room = `faction:${factionId}`;
    const refresh = (payload: unknown) => {
      const p = payload as { factionId?: string } | undefined;
      if (!p || p.factionId === factionId) {
        dispatch(fetchFaction({ campaignId, factionId }));
      }
    };
    realtime.join(room);
    const events = Object.values(FACTION_IMAGE_EVENTS);
    events.forEach((e) => realtime.on(e, refresh));
    return () => {
      events.forEach((e) => realtime.off(e, refresh));
      realtime.leave(room);
    };
  }, [campaignId, factionId, dispatch]);

  // Gentle fallback (20s) ONLY while forging; stops automatically once the
  // status is terminal (pending_approval / active / generation_failed).
  useEffect(() => {
    if (selected?.status !== 'generating_symbol') return;
    const id = window.setInterval(() => {
      dispatch(fetchFaction({ campaignId, factionId }));
    }, FALLBACK_POLL_MS);
    return () => window.clearInterval(id);
  }, [selected?.status, campaignId, factionId, dispatch]);

  if (loading && !selected) return <Loading block label={t('faction.detail.loading')} />;

  if (!selected) {
    return (
      <>
        <BackRow>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/factions`)}>
            {t('faction.detail.back')}
          </Button>
        </BackRow>
        {error && <Alert variant="error">{t('faction.detail.notFound')}</Alert>}
      </>
    );
  }

  const f = selected;
  const typeKey = factionTypeLabelKey(f.type);
  const typeLabel = typeKey ? t(typeKey) : f.type;
  const imageUrl = displayImageUrl(f);
  const failureMessage = f.currentImage?.errorMessage ?? undefined;

  const lore: { key: string; label: string; value: string }[] = [
    { key: 'history', label: t('faction.fields.history'), value: f.history },
    { key: 'identity', label: t('faction.fields.identity'), value: f.identity },
    { key: 'memberTraits', label: t('faction.fields.memberTraits'), value: f.memberTraits },
    { key: 'values', label: t('faction.fields.values'), value: f.values },
    { key: 'colors', label: t('faction.fields.colors'), value: f.colors },
    { key: 'recurringElements', label: t('faction.fields.recurringElements'), value: f.recurringElements },
  ].filter((x) => x.value);

  const approve = () => dispatch(approveFaction({ campaignId, factionId }));
  const reject = () => dispatch(rejectFaction({ campaignId, factionId }));
  const regenerate = (withNotes: boolean) => {
    dispatch(
      regenerateFaction({ campaignId, factionId, notes: withNotes ? notes.trim() || undefined : undefined }),
    );
    setNotes('');
  };

  return (
    <>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/factions`)}>
          {t('faction.detail.back')}
        </Button>
      </BackRow>

      <Head>
        <Crest>
          {imageUrl ? <img src={imageUrl} alt={f.name} /> : <ShieldIcon size={48} />}
        </Crest>
        <Titles>
          <Badges>
            <Badge $tone="primary">{typeLabel}</Badge>
            <Badge $tone="accent">{t(`faction.symbolType.${f.symbolType}`)}</Badge>
            <Badge $tone={statusTone[f.status]}>{t(`faction.status.${f.status}`)}</Badge>
          </Badges>
          <Name>{f.name}</Name>
          {f.motto && <Motto>“{f.motto}”</Motto>}
          {f.description && <Lead>{f.description}</Lead>}
        </Titles>
      </Head>

      <Chapter>
        <ChapterHeading eyebrow={t('faction.detail.symbolEyebrow')} title={t('faction.detail.symbolTitle')} />

        {f.status === 'generating_symbol' && (
          <Card>
            <Forge>
              <Loading label={t('faction.detail.generating')} />
              <Lead>{t('faction.detail.generatingHint')}</Lead>
            </Forge>
          </Card>
        )}

        {f.status === 'generation_failed' && (
          <Card>
            <Alert variant="error">
              {t('faction.detail.failed')}
              {failureMessage ? ` (${failureMessage})` : ''}
            </Alert>
            {isMaster && (
              <Actions style={{ marginTop: '1rem' }}>
                <Button onClick={() => regenerate(false)} loading={saving}>
                  {t('faction.detail.retry')}
                </Button>
              </Actions>
            )}
          </Card>
        )}

        {f.status === 'pending_approval' && (
          <Card>
            <Alert variant="warning">{t('faction.detail.pendingHint')}</Alert>
            {isMaster && (
              <>
                <Actions style={{ marginTop: '1rem' }}>
                  <Button onClick={approve} loading={saving}>{t('faction.detail.approve')}</Button>
                  <Button variant="danger" onClick={reject} disabled={saving}>{t('faction.detail.reject')}</Button>
                </Actions>
                <AdjustBox>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('faction.detail.adjustPlaceholder')}
                  />
                  <Actions>
                    <Button variant="secondary" onClick={() => regenerate(true)} loading={saving}>
                      {t('faction.detail.requestAdjustments')}
                    </Button>
                  </Actions>
                </AdjustBox>
              </>
            )}
          </Card>
        )}

        {isMaster && (f.status === 'active' || f.status === 'draft') && (
          <Actions>
            <Button variant="secondary" onClick={() => regenerate(false)} loading={saving}>
              {t('faction.detail.regenerate')}
            </Button>
          </Actions>
        )}

        {f.images && f.images.some((i) => i.imageUrl) && (
          <>
            <Divider label={t('faction.detail.historyLabel')} />
            <Badges>
              {f.images
                .filter((i) => i.imageUrl)
                .map((img) => (
                  <Crest key={img.id} style={{ width: 84, height: 84 }}>
                    <img src={img.imageUrl as string} alt="" loading="lazy" />
                  </Crest>
                ))}
            </Badges>
          </>
        )}
      </Chapter>

      {lore.map((entry) => (
        <Chapter key={entry.key}>
          <ChapterHeading title={entry.label} />
          <Prose>{entry.value}</Prose>
        </Chapter>
      ))}

      <Divider variant="ornament" />
    </>
  );
}
