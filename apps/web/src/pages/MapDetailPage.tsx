import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Badge,
  Button,
  Divider,
  Loading,
  Alert,
  Textarea,
  Switch,
} from '../components/ui';
import { MapIcon } from '../components/icons';
import { MapPointsSection } from '../components/MapPointsSection';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMap,
  fetchMaps,
  clearSelectedMap,
  removeMap,
  updateMap,
  regenerateMapImage,
  mapImageUpdate,
} from '../store/slices/maps.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { useImageFallbackPoll } from '../hooks/useImageFallbackPoll';
import { realtime, MAP_IMAGE_EVENTS } from '../services/realtime';
import { MapImageStatus } from '../types/map';
import { media } from '../styles/media';

const BackRow = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;
const Head = styled.header`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  ${media.tablet} {
    grid-template-columns: 320px 1fr;
  }
`;
const Picture = styled.div`
  position: relative;
  aspect-ratio: 4 / 3;
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
/** Deterministic label drawn over the map at a percentage position. */
const Label = styled.span<{ $x: number; $y: number }>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: ${({ $y }) => $y}%;
  transform: translate(-50%, -50%);
  max-width: 45%;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 82%, transparent);
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`;

const Titles = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Name = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  color: ${({ theme }) => theme.colors.text};
`;
const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
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
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;
const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
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
  overflow-wrap: anywhere;
`;

const eventStatus: Record<string, MapImageStatus> = {
  [MAP_IMAGE_EVENTS.processing]: 'processing',
  [MAP_IMAGE_EVENTS.completed]: 'completed',
  [MAP_IMAGE_EVENTS.failed]: 'failed',
};

export function MapDetailPage() {
  const { t } = useTranslation();
  const { campaignId = '', mapId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, list, loading, saving, error } = useAppSelector((s) => s.maps);
  const isMaster = useIsCampaignMaster(campaignId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [ignoreArt, setIgnoreArt] = useState(false);
  const [includeLabels, setIncludeLabels] = useState(false);

  useEffect(() => {
    if (campaignId && mapId) {
      dispatch(fetchMap({ campaignId, mapId }));
      dispatch(fetchMaps(campaignId));
    }
    return () => {
      dispatch(clearSelectedMap());
    };
  }, [campaignId, mapId, dispatch]);

  useEffect(() => {
    if (!campaignId || !mapId) return;
    const rooms = [`map:${mapId}`, `campaign:${campaignId}`];
    const handler = (event: string) => (payload: unknown) => {
      const p = payload as { mapId?: string; imageUrl?: string; errorMessage?: string };
      if (p?.mapId !== mapId) return;
      dispatch(
        mapImageUpdate({
          mapId,
          imageStatus: eventStatus[event],
          imageUrl: p.imageUrl,
          imageError: p.errorMessage ?? null,
        }),
      );
    };
    const handlers = Object.values(MAP_IMAGE_EVENTS).map((e) => {
      const h = handler(e);
      realtime.on(e, h);
      return [e, h] as const;
    });
    rooms.forEach((r) => realtime.join(r));
    return () => {
      handlers.forEach(([e, h]) => realtime.off(e, h));
      rooms.forEach((r) => realtime.leave(r));
    };
  }, [campaignId, mapId, dispatch]);

  const m = selected?.id === mapId ? selected : null;
  const inFlight = m?.imageStatus === 'pending' || m?.imageStatus === 'processing';
  useImageFallbackPoll(!!inFlight, () =>
    dispatch(fetchMap({ campaignId, mapId })),
  );

  if (loading && !m) return <Loading block label={t('map.detail.loading')} />;
  if (!m) {
    return (
      <>
        <BackRow>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/maps`)}>
            {t('map.detail.back')}
          </Button>
        </BackRow>
        {error && <Alert variant="error">{t('map.detail.notFound')}</Alert>}
      </>
    );
  }

  const parentName = m.parentMapId ? list.find((x) => x.id === m.parentMapId)?.name : undefined;
  const generating = m.imageStatus === 'pending' || m.imageStatus === 'processing';

  const toggleVisibility = () =>
    dispatch(updateMap({ campaignId, mapId, input: { isVisibleToPlayers: !m.isVisibleToPlayers } }));
  const submitAdjust = () => {
    dispatch(
      regenerateMapImage({
        campaignId,
        mapId,
        adjustments: adjustText.trim() || undefined,
        ignoreCampaignArtDirection: ignoreArt,
        includeLabels,
      }),
    );
    setAdjustOpen(false);
    setAdjustText('');
    setIgnoreArt(false);
    setIncludeLabels(false);
  };
  const doDelete = () =>
    dispatch(removeMap({ campaignId, mapId }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/maps`, { replace: true }))
      .catch(() => setConfirmDelete(false));

  const lore: { key: string; value: string | null }[] = [
    { key: 'description', value: m.description },
    { key: 'history', value: m.history },
    { key: 'notes', value: m.notes },
    { key: 'artDirection', value: m.artDirection },
  ];

  return (
    <>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/maps`)}>
          {t('map.detail.back')}
        </Button>
        {isMaster && (
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/maps/${mapId}/edit`)}>
              {t('map.detail.edit')}
            </Button>
            {confirmDelete ? (
              <>
                <Button size="sm" variant="danger" loading={saving} onClick={doDelete}>
                  {t('map.detail.confirmDelete')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t('map.form.cancel')}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                {t('map.detail.delete')}
              </Button>
            )}
          </Actions>
        )}
      </BackRow>

      <Head>
        <Picture>
          {m.imageUrl ? <img src={m.imageUrl} alt={m.name} /> : <MapIcon size={48} />}
          {/* Reliable labels drawn deterministically from points of interest. */}
          {m.imageUrl &&
            (m.points ?? [])
              .filter((p) => p.showLabelOnMap && p.x != null && p.y != null)
              .map((p) => (
                <Label key={p.id} $x={p.x as number} $y={p.y as number}>
                  {p.name}
                </Label>
              ))}
        </Picture>
        <Titles>
          <Badges>
            {m.type && <Badge $tone="primary">{t(`map.type.${m.type}`, m.type)}</Badge>}
            {parentName && (
              <Badge $tone="neutral" style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${campaignId}/maps/${m.parentMapId}`)}>
                ↑ {parentName}
              </Badge>
            )}
            {isMaster && (
              <Badge $tone={m.isVisibleToPlayers ? 'success' : 'neutral'}>
                {t(m.isVisibleToPlayers ? 'map.visibility.public' : 'map.visibility.private')}
              </Badge>
            )}
            {m.imageStatus !== 'none' && m.imageStatus !== 'completed' && (
              <Badge $tone={m.imageStatus === 'failed' ? 'danger' : 'info'}>
                {t(`map.imageStatus.${m.imageStatus}`)}
              </Badge>
            )}
          </Badges>
          <Name>{m.name}</Name>
          {m.shortDescription && <Prose>{m.shortDescription}</Prose>}

          {isMaster && (
            <Actions>
              {m.imageStatus === 'completed' ? (
                <Button size="sm" variant="secondary" onClick={() => setAdjustOpen((o) => !o)}>
                  {t('map.detail.requestChange')}
                </Button>
              ) : (
                <Button size="sm" variant="secondary" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>
                  {t('map.detail.generate')}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={toggleVisibility} disabled={saving}>
                {t(m.isVisibleToPlayers ? 'map.detail.makePrivate' : 'map.detail.makePublic')}
              </Button>
            </Actions>
          )}
          {isMaster && adjustOpen && (
            <AdjustBox>
              <Hint>{t('map.detail.adjustHelp')}</Hint>
              <Textarea value={adjustText} placeholder={t('map.detail.adjustPlaceholder')} onChange={(e) => setAdjustText(e.target.value)} />
              <Switch label={t('map.fields.ignoreArtDirection')} checked={ignoreArt} onChange={(e) => setIgnoreArt(e.target.checked)} />
              <Switch label={t('map.fields.includeLabels')} checked={includeLabels} onChange={(e) => setIncludeLabels(e.target.checked)} />
              <Actions>
                <Button size="sm" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>
                  {t('map.detail.generateVersion')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>
                  {t('map.form.cancel')}
                </Button>
              </Actions>
            </AdjustBox>
          )}
          {m.imageStatus === 'failed' && m.imageError && <Alert variant="error">{m.imageError}</Alert>}
        </Titles>
      </Head>

      {lore
        .filter((x) => x.value)
        .map((entry) => (
          <Chapter key={entry.key}>
            <ChapterHeading title={t(`map.fields.${entry.key}`)} />
            <Prose>{entry.value}</Prose>
          </Chapter>
        ))}

      <Chapter>
        <ChapterHeading eyebrow={t('map.point.eyebrow')} title={t('map.point.title')} />
        <MapPointsSection campaignId={campaignId} mapId={mapId} points={m.points ?? []} canManage={isMaster} />
      </Chapter>

      <Divider variant="ornament" />
    </>
  );
}
