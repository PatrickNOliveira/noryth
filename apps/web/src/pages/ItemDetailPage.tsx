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
import { BookIcon } from '../components/icons';
import { ItemInstancesSection } from '../components/ItemInstancesSection';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchItem,
  clearSelectedItem,
  removeItem,
  updateItem,
  regenerateItemImage,
  itemImageUpdate,
} from '../store/slices/items.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { useImageFallbackPoll } from '../hooks/useImageFallbackPoll';
import { realtime, ITEM_IMAGE_EVENTS } from '../services/realtime';
import { ItemImageStatus } from '../types/item';
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
    grid-template-columns: 240px 1fr;
  }
`;
const Picture = styled.div`
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

const eventStatus: Record<string, ItemImageStatus> = {
  [ITEM_IMAGE_EVENTS.processing]: 'processing',
  [ITEM_IMAGE_EVENTS.completed]: 'completed',
  [ITEM_IMAGE_EVENTS.failed]: 'failed',
};

export function ItemDetailPage() {
  const { t } = useTranslation();
  const { campaignId = '', itemId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error } = useAppSelector((s) => s.items);
  const isMaster = useIsCampaignMaster(campaignId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [ignoreArt, setIgnoreArt] = useState(false);

  useEffect(() => {
    if (campaignId && itemId) dispatch(fetchItem({ campaignId, id: itemId }));
    return () => {
      dispatch(clearSelectedItem());
    };
  }, [campaignId, itemId, dispatch]);

  useEffect(() => {
    if (!campaignId || !itemId) return;
    const rooms = [`item:${itemId}`, `campaign:${campaignId}`];
    const handler = (event: string) => (payload: unknown) => {
      const p = payload as { itemDefinitionId?: string; imageUrl?: string; errorMessage?: string };
      if (p?.itemDefinitionId !== itemId) return;
      dispatch(
        itemImageUpdate({
          itemDefinitionId: itemId,
          imageStatus: eventStatus[event],
          imageUrl: p.imageUrl,
          imageError: p.errorMessage ?? null,
        }),
      );
    };
    const handlers = Object.values(ITEM_IMAGE_EVENTS).map((e) => {
      const h = handler(e);
      realtime.on(e, h);
      return [e, h] as const;
    });
    rooms.forEach((r) => realtime.join(r));
    return () => {
      handlers.forEach(([e, h]) => realtime.off(e, h));
      rooms.forEach((r) => realtime.leave(r));
    };
  }, [campaignId, itemId, dispatch]);

  const d = selected?.id === itemId ? selected : null;
  const inFlight = d?.imageStatus === 'pending' || d?.imageStatus === 'processing';
  useImageFallbackPoll(!!inFlight, () => dispatch(fetchItem({ campaignId, id: itemId })));

  if (loading && !d) return <Loading block label={t('item.detail.loading')} />;
  if (!d) {
    return (
      <>
        <BackRow>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/items`)}>
            {t('item.detail.back')}
          </Button>
        </BackRow>
        {error && <Alert variant="error">{t('item.detail.notFound')}</Alert>}
      </>
    );
  }

  const generating = d.imageStatus === 'pending' || d.imageStatus === 'processing';

  const toggleVisibility = () =>
    dispatch(updateItem({ campaignId, id: itemId, input: { isVisibleToPlayers: !d.isVisibleToPlayers } }));
  const submitAdjust = () => {
    dispatch(
      regenerateItemImage({
        campaignId,
        id: itemId,
        adjustments: adjustText.trim() || undefined,
        ignoreCampaignArtDirection: ignoreArt,
      }),
    );
    setAdjustOpen(false);
    setAdjustText('');
    setIgnoreArt(false);
  };
  const doDelete = () =>
    dispatch(removeItem({ campaignId, id: itemId }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/items`, { replace: true }))
      .catch(() => setConfirmDelete(false));

  const lore: { key: string; value: string | null }[] = [
    { key: 'description', value: d.description },
    { key: 'appearance', value: d.appearance },
    { key: 'effectDescription', value: d.effectDescription },
    { key: 'rulesText', value: d.rulesText },
    { key: 'history', value: d.history },
    { key: 'masterNotes', value: d.masterNotes },
  ];

  return (
    <>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/items`)}>
          {t('item.detail.back')}
        </Button>
        {isMaster && (
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/items/${itemId}/edit`)}>
              {t('item.detail.edit')}
            </Button>
            {confirmDelete ? (
              <>
                <Button size="sm" variant="danger" loading={saving} onClick={doDelete}>{t('item.detail.confirmDelete')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>{t('item.form.cancel')}</Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>{t('item.detail.delete')}</Button>
            )}
          </Actions>
        )}
      </BackRow>

      <Head>
        <Picture>{d.imageUrl ? <img src={d.imageUrl} alt={d.name} /> : <BookIcon size={44} />}</Picture>
        <Titles>
          <Badges>
            {d.type && <Badge $tone="primary">{t(`item.type.${d.type}`, d.type)}</Badge>}
            {d.isUnique && <Badge $tone="accent">{t('item.badge.unique')}</Badge>}
            {isMaster && (
              <Badge $tone={d.isVisibleToPlayers ? 'success' : 'neutral'}>
                {t(d.isVisibleToPlayers ? 'item.visibility.public' : 'item.visibility.private')}
              </Badge>
            )}
            {d.imageStatus !== 'none' && d.imageStatus !== 'completed' && (
              <Badge $tone={d.imageStatus === 'failed' ? 'danger' : 'info'}>{t(`item.imageStatus.${d.imageStatus}`)}</Badge>
            )}
          </Badges>
          <Name>{d.name}</Name>
          {d.shortDescription && <Prose>{d.shortDescription}</Prose>}

          {isMaster && (
            <Actions>
              {d.imageStatus === 'completed' ? (
                <Button size="sm" variant="secondary" onClick={() => setAdjustOpen((o) => !o)}>{t('item.detail.requestChange')}</Button>
              ) : (
                <Button size="sm" variant="secondary" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>{t('item.detail.generate')}</Button>
              )}
              <Button size="sm" variant="ghost" onClick={toggleVisibility} disabled={saving}>
                {t(d.isVisibleToPlayers ? 'item.detail.makePrivate' : 'item.detail.makePublic')}
              </Button>
            </Actions>
          )}
          {isMaster && adjustOpen && (
            <AdjustBox>
              <Textarea value={adjustText} placeholder={t('item.detail.adjustPlaceholder')} onChange={(e) => setAdjustText(e.target.value)} />
              <Switch label={t('item.fields.ignoreArtDirection')} checked={ignoreArt} onChange={(e) => setIgnoreArt(e.target.checked)} />
              <Actions>
                <Button size="sm" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>{t('item.detail.generateVersion')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>{t('item.form.cancel')}</Button>
              </Actions>
            </AdjustBox>
          )}
          {d.imageStatus === 'failed' && d.imageError && <Alert variant="error">{d.imageError}</Alert>}
        </Titles>
      </Head>

      {lore
        .filter((x) => x.value)
        .map((entry) => (
          <Chapter key={entry.key}>
            <ChapterHeading title={t(`item.fields.${entry.key}`)} />
            <Prose>{entry.value}</Prose>
          </Chapter>
        ))}

      <Chapter>
        <ChapterHeading eyebrow={t('item.instance.eyebrow')} title={t('item.instance.title')} lead={t('item.instance.lead')} />
        <ItemInstancesSection
          campaignId={campaignId}
          itemDefinitionId={itemId}
          definitionName={d.name}
          isUnique={d.isUnique}
          canManage={isMaster}
        />
      </Chapter>

      <Divider variant="ornament" />
    </>
  );
}
