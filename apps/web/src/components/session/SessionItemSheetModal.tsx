import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Badge, Button, Input, Loading, Alert, useToast } from '../ui';
import { BookIcon } from '../icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCharacters } from '../../store/slices/characters.slice';
import { itemService } from '../../services/item.service';
import {
  realtime,
  ITEM_INSTANCE_EVENTS,
} from '../../services/realtime';
import { ItemInstance, ItemSessionDetail } from '../../types/item';
import { Character } from '../../types/character';
import { CharacterPickerModal } from './CharacterPickerModal';

const Head = styled.header`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: flex-start;
`;
const Thumb = styled.div`
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const HeadInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;
const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
`;
const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.md};
`;
const SectionTitle = styled.h4`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.primary};
`;
const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
const GiveBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;
const QtyField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  width: 96px;
`;
const InstanceCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;
const InstanceHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
`;
const InstanceMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;
const InstanceActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

type PickerMode =
  | { kind: 'give' }
  | { kind: 'transfer'; instanceId: string }
  | null;

interface Props {
  campaignId: string;
  itemDefinitionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Bubbled up so the list can refresh instance counts. */
  onInstancesChanged?: (itemDefinitionId: string) => void;
}

/**
 * Master item sheet for the session manager: the definition plus its instances,
 * with actions to give the item to a character, transfer a specific instance, or
 * clear an instance's holder. Optimistic-ish: each action updates the local
 * instance list from the server's response and guards against double-clicks.
 */
export function SessionItemSheetModal({
  campaignId,
  itemDefinitionId,
  isOpen,
  onClose,
  onInstancesChanged,
}: Props) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const dispatch = useAppDispatch();
  const characters = useAppSelector((s) => s.characters.list);
  const myUserId = useAppSelector((s) => s.auth.user?.id);

  const [detail, setDetail] = useState<ItemSessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [picker, setPicker] = useState<PickerMode>(null);
  const [pendingCharacterId, setPendingCharacterId] = useState<string | null>(null);
  const [pendingInstanceIds, setPendingInstanceIds] = useState<string[]>([]);

  const load = useCallback(() => {
    if (!itemDefinitionId) return;
    setLoading(true);
    setError(false);
    let cancelled = false;
    itemService
      .sessionDetail(campaignId, itemDefinitionId)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [campaignId, itemDefinitionId]);

  useEffect(() => {
    if (!isOpen || !itemDefinitionId) return;
    setDetail(null);
    setQuantity('1');
    setPicker(null);
    setPendingCharacterId(null);
    setPendingInstanceIds([]);
    dispatch(fetchCharacters(campaignId));
    const cleanup = load();
    return cleanup;
  }, [isOpen, itemDefinitionId, campaignId, dispatch, load]);

  // Live updates from other masters: refetch when this item's instances change.
  useEffect(() => {
    if (!isOpen || !itemDefinitionId) return;
    const room = `campaign:${campaignId}`;
    const onChange = (payload: unknown) => {
      const p = payload as {
        itemDefinitionId?: string;
        originUserId?: string | null;
      };
      if (p?.itemDefinitionId !== itemDefinitionId) return;
      if (p?.originUserId && p.originUserId === myUserId) return; // own echo
      load();
    };
    const events = [
      ITEM_INSTANCE_EVENTS.created,
      ITEM_INSTANCE_EVENTS.transferred,
      ITEM_INSTANCE_EVENTS.unassigned,
    ];
    realtime.join(room);
    events.forEach((e) => realtime.on(e, onChange));
    return () => {
      events.forEach((e) => realtime.off(e, onChange));
      realtime.leave(room);
    };
  }, [isOpen, itemDefinitionId, campaignId, myUserId, load]);

  const nameOf = useMemo(() => {
    const map = new Map(characters.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? t('session.items.unknownCharacter') : null);
  }, [characters, t]);

  const def = detail?.definition ?? null;
  const instances = detail?.instances ?? [];

  const upsertInstance = (instance: ItemInstance) => {
    setDetail((prev) => {
      if (!prev) return prev;
      const exists = prev.instances.some((i) => i.id === instance.id);
      const next = exists
        ? prev.instances.map((i) => (i.id === instance.id ? instance : i))
        : [instance, ...prev.instances];
      return { ...prev, instances: next };
    });
    if (itemDefinitionId) onInstancesChanged?.(itemDefinitionId);
  };

  const qtyValid = Number.isInteger(Number(quantity)) && Number(quantity) >= 1;

  const onPick = (character: Character) => {
    if (!def || !picker || pendingCharacterId) return;
    setPendingCharacterId(character.id);
    const mode = picker;
    const request =
      mode.kind === 'give'
        ? itemService.giveToCharacter(campaignId, def.id, {
            characterId: character.id,
            quantity: def.isUnique ? 1 : Number(quantity),
          })
        : itemService.transferInstance(campaignId, mode.instanceId, character.id);
    request
      .then((instance) => {
        upsertInstance(instance);
        setPicker(null);
      })
      .catch(() =>
        notify(
          t(mode.kind === 'give' ? 'session.items.giveError' : 'session.items.transferError'),
          { variant: 'error' },
        ),
      )
      .finally(() => setPendingCharacterId(null));
  };

  const unassign = (instance: ItemInstance) => {
    if (pendingInstanceIds.includes(instance.id)) return;
    setPendingInstanceIds((ids) => [...ids, instance.id]);
    itemService
      .unassignHolder(campaignId, instance.id)
      .then(upsertInstance)
      .catch(() => notify(t('session.items.unassignError'), { variant: 'error' }))
      .finally(() =>
        setPendingInstanceIds((ids) => ids.filter((id) => id !== instance.id)),
      );
  };

  const prose = (label: string, value?: string | null) =>
    value && value.trim() ? (
      <Section>
        <SectionTitle>{label}</SectionTitle>
        <Prose>{value}</Prose>
      </Section>
    ) : null;

  const locationLabel = (i: ItemInstance): string | null => {
    if (i.holderCharacterId) {
      return t('session.items.holder', { name: nameOf(i.holderCharacterId) });
    }
    if (i.mapPointOfInterestId) return t('session.items.atPoint');
    if (i.mapId) return t('session.items.onMap');
    return t('session.items.noLocation');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t('session.items.sheetTitle')}
    >
      {loading && !detail && <Loading block label={t('session.items.loading')} />}
      {error && !loading && <Alert variant="error">{t('session.items.detailError')}</Alert>}

      {def && (
        <>
          <Head>
            <Thumb>
              {def.imageUrl ? <img src={def.imageUrl} alt={def.name} /> : <BookIcon size={28} />}
            </Thumb>
            <HeadInfo>
              <Name>{def.name}</Name>
              <Badges>
                {def.type && <Badge $tone="primary">{t(`item.type.${def.type}`, def.type)}</Badge>}
                {def.isUnique && <Badge $tone="accent">{t('session.itemSheet.unique')}</Badge>}
                <Badge $tone={def.isVisibleToPlayers ? 'success' : 'neutral'}>
                  {def.isVisibleToPlayers
                    ? t('session.itemSheet.visible')
                    : t('session.itemSheet.hidden')}
                </Badge>
              </Badges>
            </HeadInfo>
          </Head>

          {def.shortDescription && <Prose style={{ marginTop: 12 }}>{def.shortDescription}</Prose>}
          {prose(t('session.itemSheet.appearance'), def.appearance)}
          {prose(t('session.itemSheet.description'), def.description)}
          {prose(t('session.itemSheet.effect'), def.effectDescription)}
          {prose(t('session.itemSheet.rules'), def.rulesText)}
          {prose(t('session.itemSheet.history'), def.history)}
          {prose(t('session.itemSheet.masterNotes'), def.masterNotes)}

          <Section>
            <SectionTitle>{t('session.items.giveTitle')}</SectionTitle>
            <GiveBar>
              {!def.isUnique && (
                <QtyField>
                  {t('session.createItem.quantity')}
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </QtyField>
              )}
              <Button
                type="button"
                disabled={!def.isUnique && !qtyValid}
                onClick={() => setPicker({ kind: 'give' })}
              >
                {def.isUnique
                  ? t('session.items.transferToCharacter')
                  : t('session.items.giveNew')}
              </Button>
            </GiveBar>
          </Section>

          <Section>
            <SectionTitle>
              {t('session.items.instances', { count: instances.length })}
            </SectionTitle>
            {instances.length === 0 ? (
              <InstanceMeta>{t('session.items.noInstances')}</InstanceMeta>
            ) : (
              instances.map((i, idx) => {
                const pending = pendingInstanceIds.includes(i.id);
                return (
                  <InstanceCard key={i.id}>
                    <InstanceHead>
                      <Name as="span">#{idx + 1}</Name>
                      <Badge $tone="info">{t(`item.state.${i.state}`, i.state)}</Badge>
                      {i.quantity > 1 && <Badge $tone="neutral">×{i.quantity}</Badge>}
                      {i.isVisibleToPlayers && (
                        <Badge $tone="success">{t('session.itemSheet.visible')}</Badge>
                      )}
                    </InstanceHead>
                    <InstanceMeta>{locationLabel(i)}</InstanceMeta>
                    {i.masterNotes && <InstanceMeta>{i.masterNotes}</InstanceMeta>}
                    <InstanceActions>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={() => setPicker({ kind: 'transfer', instanceId: i.id })}
                      >
                        {t('session.items.transferThis')}
                      </Button>
                      {i.holderCharacterId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          loading={pending}
                          onClick={() => unassign(i)}
                        >
                          {t('session.items.unassign')}
                        </Button>
                      )}
                    </InstanceActions>
                  </InstanceCard>
                );
              })
            )}
          </Section>
        </>
      )}

      <CharacterPickerModal
        campaignId={campaignId}
        isOpen={!!picker}
        onClose={() => (pendingCharacterId ? undefined : setPicker(null))}
        onPick={onPick}
        pendingCharacterId={pendingCharacterId}
        title={
          picker?.kind === 'transfer'
            ? t('session.items.transferThis')
            : t('session.items.giveTitle')
        }
      />
    </Modal>
  );
}
