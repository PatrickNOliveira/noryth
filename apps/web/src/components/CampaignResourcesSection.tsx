import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Alert,
  Badge,
  Button,
  ChapterHeading,
  Divider,
  EmptyState,
  FormField,
  Input,
  Switch,
  Textarea,
  Loading,
} from './ui';
import { DiceIcon, PlusIcon } from './icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createResource,
  fetchResources,
  removeResource,
  updateResource,
  clearResources,
  clearResourcesError,
} from '../store/slices/resources.slice';
import { ResourceDefinition } from '../types/resource';
import { media } from '../styles/media';

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;
const Rows = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
`;
const RowTop = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;
const Desc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-left: auto;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
  ${media.tablet} {
    grid-template-columns: 2fr 1fr 1fr;
    align-items: start;
  }
`;

interface Draft {
  name: string;
  description: string;
  min: string;
  max: string;
  visible: boolean;
}
const EMPTY: Draft = { name: '', description: '', min: '0', max: '', visible: false };

const toDraft = (r: ResourceDefinition): Draft => ({
  name: r.name,
  description: r.description,
  min: String(r.minValue),
  max: String(r.defaultMaxValue),
  visible: r.isVisibleToPlayers,
});

function parseDraft(d: Draft) {
  const name = d.name.trim();
  const min = Number(d.min);
  const max = Number(d.max);
  const nameValid = name.length > 0;
  const numsValid =
    d.min !== '' && d.max !== '' && Number.isInteger(min) && Number.isInteger(max);
  const rangeValid = numsValid && min <= max;
  return { name, min, max, nameValid, rangeValid, valid: nameValid && rangeValid };
}

interface Props {
  campaignId: string;
  canManage?: boolean;
}

/**
 * "Recursos" — lets the master define per-campaign character resources (Vida,
 * Mana, Sanidade…): name, description, min, default max and player visibility.
 * Type is POOL and the initial current value is the max (MVP defaults). Resources
 * belong to the table, not to any character.
 */
export function CampaignResourcesSection({ campaignId, canManage = false }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { list, loading, saving, error } = useAppSelector((s) => s.resources);

  const [addDraft, setAddDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchResources(campaignId));
    return () => {
      dispatch(clearResources());
    };
  }, [campaignId, dispatch]);

  const addState = useMemo(() => parseDraft(addDraft), [addDraft]);
  const editState = useMemo(() => parseDraft(editDraft), [editDraft]);

  const submitAdd = () => {
    if (!addState.valid || saving) return;
    dispatch(
      createResource({
        campaignId,
        input: {
          name: addState.name,
          description: addDraft.description.trim(),
          minValue: addState.min,
          defaultMaxValue: addState.max,
          isVisibleToPlayers: addDraft.visible,
        },
      }),
    )
      .unwrap()
      .then(() => setAddDraft(EMPTY))
      .catch(() => {});
  };

  const startEdit = (r: ResourceDefinition) => {
    dispatch(clearResourcesError());
    setConfirmId(null);
    setEditingId(r.id);
    setEditDraft(toDraft(r));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY);
  };
  const submitEdit = (resourceId: string) => {
    if (!editState.valid || saving) return;
    dispatch(
      updateResource({
        campaignId,
        resourceId,
        input: {
          name: editState.name,
          description: editDraft.description.trim(),
          minValue: editState.min,
          defaultMaxValue: editState.max,
          isVisibleToPlayers: editDraft.visible,
        },
      }),
    )
      .unwrap()
      .then(cancelEdit)
      .catch(() => {});
  };
  const confirmRemove = (resourceId: string) => {
    dispatch(removeResource({ campaignId, resourceId }))
      .unwrap()
      .then(() => setConfirmId(null))
      .catch(() => setConfirmId(null));
  };

  const draftFields = (
    draft: Draft,
    setDraft: (d: Draft) => void,
    state: ReturnType<typeof parseDraft>,
  ) => (
    <>
      <Grid>
        <FormField
          label={t('campaign.resources.fields.name')}
          error={draft.name && !state.nameValid ? t('campaign.resources.validation.nameRequired') : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={draft.name}
              maxLength={60}
              placeholder={t('campaign.resources.placeholders.name')}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          )}
        </FormField>
        <FormField
          label={t('campaign.resources.fields.min')}
          error={draft.min && draft.max && !state.rangeValid ? t('campaign.resources.validation.range') : undefined}
        >
          {(p) => (
            <Input {...p} type="number" inputMode="numeric" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} />
          )}
        </FormField>
        <FormField label={t('campaign.resources.fields.max')}>
          {(p) => (
            <Input {...p} type="number" inputMode="numeric" value={draft.max} placeholder="10" onChange={(e) => setDraft({ ...draft, max: e.target.value })} />
          )}
        </FormField>
      </Grid>
      <FormField label={t('campaign.resources.fields.description')}>
        {(p) => (
          <Textarea {...p} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        )}
      </FormField>
      <Switch
        label={t('campaign.resources.fields.visible')}
        checked={draft.visible}
        onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
      />
    </>
  );

  return (
    <Section>
      <ChapterHeading
        eyebrow={t('campaign.resources.eyebrow')}
        title={t('campaign.resources.title')}
      />
      <p>{t('campaign.resources.lead')}</p>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && list.length === 0 ? (
        <Loading block label={t('campaign.resources.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<DiceIcon size={40} />}
          title={t('campaign.resources.emptyTitle')}
          description={t('campaign.resources.emptyDescription')}
        />
      ) : (
        <Rows>
          {list.map((r) =>
            editingId === r.id ? (
              <Row key={r.id}>
                {draftFields(editDraft, setEditDraft, editState)}
                <Actions>
                  <Button size="sm" variant="primary" loading={saving} disabled={!editState.valid} onClick={() => submitEdit(r.id)}>
                    {t('campaign.resources.actions.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    {t('campaign.resources.actions.cancel')}
                  </Button>
                </Actions>
              </Row>
            ) : (
              <Row key={r.id}>
                <RowTop>
                  <Name>{r.name}</Name>
                  <Badge $tone="neutral">
                    {t('campaign.resources.range', { min: r.minValue, max: r.defaultMaxValue })}
                  </Badge>
                  <Badge $tone={r.isVisibleToPlayers ? 'success' : 'neutral'}>
                    {r.isVisibleToPlayers ? t('campaign.resources.visible') : t('campaign.resources.hidden')}
                  </Badge>
                  {canManage &&
                    (confirmId === r.id ? (
                      <Actions>
                        <span>{t('campaign.resources.confirmRemove')}</span>
                        <Button size="sm" variant="danger" loading={saving} onClick={() => confirmRemove(r.id)}>
                          {t('campaign.resources.actions.confirmYes')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                          {t('campaign.resources.actions.confirmNo')}
                        </Button>
                      </Actions>
                    ) : (
                      <Actions>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(r)}>
                          {t('campaign.resources.actions.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            dispatch(clearResourcesError());
                            setConfirmId(r.id);
                          }}
                        >
                          {t('campaign.resources.actions.remove')}
                        </Button>
                      </Actions>
                    ))}
                </RowTop>
                {r.description && <Desc>{r.description}</Desc>}
              </Row>
            ),
          )}
        </Rows>
      )}

      {canManage && (
        <>
          <Divider variant="ornament" />
          <ChapterHeading
            eyebrow={t('campaign.resources.addEyebrow')}
            title={t('campaign.resources.addTitle')}
          />
          <Row as="div">
            {draftFields(addDraft, setAddDraft, addState)}
            <Actions>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<PlusIcon size={16} />}
                loading={saving && editingId === null && confirmId === null}
                disabled={!addState.valid}
                onClick={submitAdd}
              >
                {t('campaign.resources.actions.add')}
              </Button>
            </Actions>
          </Row>
        </>
      )}
    </Section>
  );
}
