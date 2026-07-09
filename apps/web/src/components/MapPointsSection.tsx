import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Badge,
  Button,
  FormField,
  Input,
  Textarea,
  Switch,
  EmptyState,
} from './ui';
import { MapIcon } from './icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createMapPoint,
  updateMapPoint,
  removeMapPoint,
} from '../store/slices/maps.slice';
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
const PName = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
  flex: 1 1 auto;
`;
const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  white-space: pre-wrap;
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
  name: string;
  type: string;
  description: string;
  notes: string;
  x: string;
  y: string;
  isVisibleToPlayers: boolean;
  showLabelOnMap: boolean;
}

const emptyDraft: Draft = {
  name: '',
  type: '',
  description: '',
  notes: '',
  x: '',
  y: '',
  isVisibleToPlayers: false,
  showLabelOnMap: false,
};

const toDraft = (p: MapPoint): Draft => ({
  name: p.name,
  type: p.type,
  description: p.description,
  notes: p.notes ?? '',
  x: p.x != null ? String(p.x) : '',
  y: p.y != null ? String(p.y) : '',
  isVisibleToPlayers: p.isVisibleToPlayers,
  showLabelOnMap: p.showLabelOnMap,
});

const numOrNull = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface Props {
  campaignId: string;
  mapId: string;
  points: MapPoint[];
  canManage: boolean;
}

export function MapPointsSection({ campaignId, mapId, points, canManage }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const saving = useAppSelector((s) => s.maps.saving);
  const [addDraft, setAddDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [adding, setAdding] = useState(false);

  const buildInput = (d: Draft) => ({
    name: d.name.trim(),
    type: d.type.trim(),
    description: d.description.trim(),
    notes: d.notes.trim(),
    x: numOrNull(d.x),
    y: numOrNull(d.y),
    isVisibleToPlayers: d.isVisibleToPlayers,
    showLabelOnMap: d.showLabelOnMap,
  });

  const submitAdd = () => {
    if (!addDraft.name.trim() || saving) return;
    dispatch(createMapPoint({ campaignId, mapId, input: buildInput(addDraft) }))
      .unwrap()
      .then(() => {
        setAddDraft(emptyDraft);
        setAdding(false);
      })
      .catch(() => {});
  };
  const submitEdit = (pointId: string) => {
    if (!editDraft.name.trim() || saving) return;
    dispatch(updateMapPoint({ campaignId, mapId, pointId, input: buildInput(editDraft) }))
      .unwrap()
      .then(() => setEditingId(null))
      .catch(() => {});
  };

  const renderFields = (draft: Draft, set: (d: Draft) => void) => (
    <Fields>
      <FormField label={t('map.point.fields.name')} required>
        {(p) => <Input {...p} value={draft.name} maxLength={120} onChange={(e) => set({ ...draft, name: e.target.value })} />}
      </FormField>
      <FormField label={t('map.point.fields.type')}>
        {(p) => <Input {...p} value={draft.type} maxLength={40} placeholder={t('map.point.typePlaceholder')} onChange={(e) => set({ ...draft, type: e.target.value })} />}
      </FormField>
      <FormField label={t('map.point.fields.description')}>
        {(p) => <Textarea {...p} value={draft.description} onChange={(e) => set({ ...draft, description: e.target.value })} />}
      </FormField>
      <FormField label={t('map.point.fields.notes')} hint={t('map.hints.masterOnly')}>
        {(p) => <Textarea {...p} value={draft.notes} onChange={(e) => set({ ...draft, notes: e.target.value })} />}
      </FormField>
      <TwoCol>
        <FormField label={t('map.point.fields.x')} hint="0–100">
          {(p) => <Input {...p} type="number" inputMode="decimal" value={draft.x} placeholder="—" onChange={(e) => set({ ...draft, x: e.target.value })} />}
        </FormField>
        <FormField label={t('map.point.fields.y')} hint="0–100">
          {(p) => <Input {...p} type="number" inputMode="decimal" value={draft.y} placeholder="—" onChange={(e) => set({ ...draft, y: e.target.value })} />}
        </FormField>
      </TwoCol>
      <Switch
        label={t('map.point.fields.visible')}
        checked={draft.isVisibleToPlayers}
        onChange={(e) => set({ ...draft, isVisibleToPlayers: e.target.checked })}
      />
      <Switch
        label={t('map.point.fields.showLabel')}
        checked={draft.showLabelOnMap}
        onChange={(e) => set({ ...draft, showLabelOnMap: e.target.checked })}
      />
    </Fields>
  );

  return (
    <Wrap>
      {points.length === 0 && !adding && (
        <EmptyState
          icon={<MapIcon size={32} />}
          title={t('map.point.emptyTitle')}
          description={canManage ? t('map.point.emptyDescription') : t('map.point.emptyPlayers')}
        />
      )}

      {points.map((p) =>
        editingId === p.id ? (
          <Row key={p.id}>
            {renderFields(editDraft, setEditDraft)}
            <Actions>
              <Button size="sm" loading={saving} disabled={!editDraft.name.trim()} onClick={() => submitEdit(p.id)}>
                {t('map.point.save')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                {t('map.form.cancel')}
              </Button>
            </Actions>
          </Row>
        ) : (
          <Row key={p.id}>
            <Head>
              <PName>{p.name}</PName>
              {p.type && <Badge $tone="accent">{p.type}</Badge>}
              {canManage && (
                <Badge $tone={p.isVisibleToPlayers ? 'success' : 'neutral'}>
                  {t(p.isVisibleToPlayers ? 'map.visibility.public' : 'map.visibility.private')}
                </Badge>
              )}
            </Head>
            {p.description && <Muted>{p.description}</Muted>}
            {p.notes && <Muted>🔒 {p.notes}</Muted>}
            {canManage && (
              <Actions>
                <Button size="sm" variant="secondary" onClick={() => { setEditingId(p.id); setEditDraft(toDraft(p)); }}>
                  {t('map.point.edit')}
                </Button>
                <Button size="sm" variant="danger" loading={saving} onClick={() => dispatch(removeMapPoint({ campaignId, mapId, pointId: p.id }))}>
                  {t('map.point.remove')}
                </Button>
              </Actions>
            )}
          </Row>
        ),
      )}

      {canManage &&
        (adding ? (
          <Row>
            {renderFields(addDraft, setAddDraft)}
            <Actions>
              <Button size="sm" loading={saving} disabled={!addDraft.name.trim()} onClick={submitAdd}>
                {t('map.point.add')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setAddDraft(emptyDraft); }}>
                {t('map.form.cancel')}
              </Button>
            </Actions>
          </Row>
        ) : (
          <div>
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              {t('map.point.new')}
            </Button>
          </div>
        ))}
    </Wrap>
  );
}
