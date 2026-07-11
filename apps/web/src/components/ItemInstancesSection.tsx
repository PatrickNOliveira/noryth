import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Badge,
  Button,
  FormField,
  Input,
  Textarea,
  Select,
  Switch,
  EmptyState,
} from './ui';
import { BookIcon } from './icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchInstances,
  createInstance,
  updateInstance,
  removeInstance,
} from '../store/slices/items.slice';
import { fetchCharacters } from '../store/slices/characters.slice';
import { fetchMaps } from '../store/slices/maps.slice';
import { mapService } from '../services/map.service';
import { ItemInstance, ITEM_STATES } from '../types/item';
import { MapPoint } from '../types/map';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const IName = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
  flex: 1 1 auto;
`;
const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;
const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

interface Draft {
  customName: string;
  customDescription: string;
  quantity: string;
  state: string;
  isVisibleToPlayers: boolean;
  holderCharacterId: string;
  mapId: string;
  mapPointOfInterestId: string;
  masterNotes: string;
}

const emptyDraft: Draft = {
  customName: '',
  customDescription: '',
  quantity: '1',
  state: 'AVAILABLE',
  isVisibleToPlayers: false,
  holderCharacterId: '',
  mapId: '',
  mapPointOfInterestId: '',
  masterNotes: '',
};

const toDraft = (i: ItemInstance): Draft => ({
  customName: i.customName ?? '',
  customDescription: i.customDescription ?? '',
  quantity: String(i.quantity),
  state: i.state,
  isVisibleToPlayers: i.isVisibleToPlayers,
  holderCharacterId: i.holderCharacterId ?? '',
  mapId: i.mapId ?? '',
  mapPointOfInterestId: i.mapPointOfInterestId ?? '',
  masterNotes: i.masterNotes ?? '',
});

interface Props {
  campaignId: string;
  itemDefinitionId: string;
  definitionName: string;
  isUnique: boolean;
  canManage: boolean;
}

export function ItemInstancesSection({
  campaignId,
  itemDefinitionId,
  definitionName,
  isUnique,
  canManage,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const instances = useAppSelector((s) => s.items.instances);
  const saving = useAppSelector((s) => s.items.saving);
  const characters = useAppSelector((s) => s.characters.list);
  const maps = useAppSelector((s) => s.maps.list);

  const [active, setActive] = useState<'none' | 'add' | string>('none');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [points, setPoints] = useState<MapPoint[]>([]);

  useEffect(() => {
    dispatch(fetchInstances({ campaignId, itemDefinitionId }));
    dispatch(fetchCharacters(campaignId));
    dispatch(fetchMaps(campaignId));
  }, [campaignId, itemDefinitionId, dispatch]);

  // Load the chosen map's points to offer a point-of-interest select.
  useEffect(() => {
    if (active === 'none' || !draft.mapId) {
      setPoints([]);
      return;
    }
    let ok = true;
    mapService
      .listPoints(campaignId, draft.mapId)
      .then((p) => ok && setPoints(p))
      .catch(() => ok && setPoints([]));
    return () => {
      ok = false;
    };
  }, [active, draft.mapId, campaignId]);

  const charName = (id: string | null) =>
    id ? characters.find((c) => c.id === id)?.name : undefined;
  const mapName = (id: string | null) =>
    id ? maps.find((m) => m.id === id)?.name : undefined;

  const openAdd = () => {
    if (isUnique && instances.length > 0) return;
    setDraft(emptyDraft);
    setActive('add');
  };
  const openEdit = (i: ItemInstance) => {
    setDraft(toDraft(i));
    setActive(i.id);
  };

  const buildInput = () => ({
    customName: draft.customName.trim() || null,
    customDescription: draft.customDescription.trim() || null,
    quantity: Number(draft.quantity) || 1,
    state: draft.state,
    isVisibleToPlayers: draft.isVisibleToPlayers,
    holderCharacterId: draft.holderCharacterId || null,
    mapId: draft.mapId || null,
    mapPointOfInterestId: draft.mapPointOfInterestId || null,
    masterNotes: draft.masterNotes.trim(),
  });

  const submit = () => {
    if (saving) return;
    if (active === 'add') {
      dispatch(createInstance({ campaignId, input: { itemDefinitionId, ...buildInput() } }))
        .unwrap()
        .then(() => setActive('none'))
        .catch(() => {});
    } else if (active !== 'none') {
      dispatch(updateInstance({ campaignId, id: active, input: buildInput() }))
        .unwrap()
        .then(() => setActive('none'))
        .catch(() => {});
    }
  };

  const location = (i: ItemInstance) => {
    if (i.holderCharacterId) return `${t('item.instance.withCharacter')}: ${charName(i.holderCharacterId) ?? '—'}`;
    if (i.mapPointOfInterestId) return `${t('item.instance.atPoint')}${mapName(i.mapId) ? ` · ${mapName(i.mapId)}` : ''}`;
    if (i.mapId) return `${t('item.instance.onMap')}: ${mapName(i.mapId) ?? '—'}`;
    return t('item.instance.noLocation');
  };

  const renderFields = () => (
    <Fields>
      <FormField label={t('item.instance.fields.customName')} hint={t('item.instance.fields.customNameHint', { name: definitionName })}>
        {(p) => <Input {...p} value={draft.customName} maxLength={160} onChange={(e) => setDraft({ ...draft, customName: e.target.value })} />}
      </FormField>
      <FormField label={t('item.instance.fields.customDescription')}>
        {(p) => <Textarea {...p} value={draft.customDescription} onChange={(e) => setDraft({ ...draft, customDescription: e.target.value })} />}
      </FormField>
      <TwoCol>
        <FormField label={t('item.instance.fields.quantity')}>
          {(p) => <Input {...p} type="number" min={1} value={draft.quantity} disabled={isUnique} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />}
        </FormField>
        <FormField label={t('item.instance.fields.state')}>
          {(p) => (
            <Select {...p} value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}>
              {ITEM_STATES.map((st) => (
                <option key={st} value={st}>{t(`item.state.${st}`)}</option>
              ))}
            </Select>
          )}
        </FormField>
      </TwoCol>
      <FormField label={t('item.instance.fields.holder')} hint={t('item.instance.locationHint')}>
        {(p) => (
          <Select
            {...p}
            value={draft.holderCharacterId}
            onChange={(e) => setDraft({ ...draft, holderCharacterId: e.target.value, mapId: '', mapPointOfInterestId: '' })}
          >
            <option value="">{t('item.instance.noHolder')}</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}
      </FormField>
      {!draft.holderCharacterId && (
        <>
          <FormField label={t('item.instance.fields.map')}>
            {(p) => (
              <Select
                {...p}
                value={draft.mapId}
                onChange={(e) => setDraft({ ...draft, mapId: e.target.value, mapPointOfInterestId: '' })}
              >
                <option value="">{t('item.instance.noMap')}</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            )}
          </FormField>
          {draft.mapId && points.length > 0 && (
            <FormField label={t('item.instance.fields.point')}>
              {(p) => (
                <Select {...p} value={draft.mapPointOfInterestId} onChange={(e) => setDraft({ ...draft, mapPointOfInterestId: e.target.value })}>
                  <option value="">{t('item.instance.noPoint')}</option>
                  {points.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </Select>
              )}
            </FormField>
          )}
        </>
      )}
      <FormField label={t('item.instance.fields.masterNotes')} hint={t('item.hints.masterOnly')}>
        {(p) => <Textarea {...p} value={draft.masterNotes} onChange={(e) => setDraft({ ...draft, masterNotes: e.target.value })} />}
      </FormField>
      <Switch label={t('item.instance.fields.visible')} checked={draft.isVisibleToPlayers} onChange={(e) => setDraft({ ...draft, isVisibleToPlayers: e.target.checked })} />
      <Actions>
        <Button size="sm" loading={saving} onClick={submit}>{t('item.instance.save')}</Button>
        <Button size="sm" variant="ghost" onClick={() => setActive('none')}>{t('item.form.cancel')}</Button>
      </Actions>
    </Fields>
  );

  return (
    <Wrap>
      {instances.length === 0 && active !== 'add' && (
        <EmptyState
          icon={<BookIcon size={32} />}
          title={t('item.instance.emptyTitle')}
          description={canManage ? t('item.instance.emptyDescription') : t('item.instance.emptyPlayers')}
        />
      )}

      {instances.map((i) =>
        active === i.id ? (
          <Row key={i.id}>{renderFields()}</Row>
        ) : (
          <Row key={i.id}>
            <Head>
              <IName>{i.customName || definitionName}</IName>
              <Badge $tone="neutral">×{i.quantity}</Badge>
              <Badge $tone="accent">{t(`item.state.${i.state}`, i.state)}</Badge>
              {canManage && (
                <Badge $tone={i.isVisibleToPlayers ? 'success' : 'neutral'}>
                  {t(i.isVisibleToPlayers ? 'item.visibility.public' : 'item.visibility.private')}
                </Badge>
              )}
            </Head>
            <Muted>{location(i)}</Muted>
            {i.customDescription && <Muted>{i.customDescription}</Muted>}
            {canManage && (
              <Actions>
                <Button size="sm" variant="secondary" onClick={() => openEdit(i)}>{t('item.instance.edit')}</Button>
                <Button size="sm" variant="danger" loading={saving} onClick={() => dispatch(removeInstance({ campaignId, id: i.id }))}>{t('item.instance.remove')}</Button>
              </Actions>
            )}
          </Row>
        ),
      )}

      {canManage &&
        (active === 'add' ? (
          <Row>{renderFields()}</Row>
        ) : (
          <div>
            <Button size="sm" variant="secondary" disabled={isUnique && instances.length > 0} onClick={openAdd}>
              {t('item.instance.new')}
            </Button>
            {isUnique && instances.length > 0 && <Muted>{t('item.instance.uniqueLimit')}</Muted>}
          </div>
        ))}
    </Wrap>
  );
}
