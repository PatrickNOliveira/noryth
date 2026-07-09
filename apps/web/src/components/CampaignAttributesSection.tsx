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
  Loading,
} from './ui';
import { DiceIcon, PlusIcon } from './icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createAttribute,
  fetchAttributes,
  removeAttribute,
  updateAttribute,
  clearAttributes,
  clearAttributesError,
} from '../store/slices/campaignAttributes.slice';
import { CampaignAttribute } from '../types/campaignAttribute';
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

  ${media.tablet} {
    flex-direction: row;
    align-items: center;
  }
`;

const RowMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
  flex: 1 1 auto;
  min-width: 0;
`;

const AttrName = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1 1 auto;

  ${media.tablet} {
    grid-template-columns: 2fr 1fr 1fr;
    align-items: start;
  }
`;

const NarrowField = styled(FormField)`
  ${media.tablet} {
    max-width: 140px;
  }
`;

interface Draft {
  name: string;
  min: string;
  max: string;
}

const EMPTY_DRAFT: Draft = { name: '', min: '', max: '' };

const toDraft = (a: CampaignAttribute): Draft => ({
  name: a.name,
  min: String(a.minValue),
  max: String(a.maxValue),
});

/** Parses a draft into integers + a validity flag, without throwing. */
function parseDraft(draft: Draft): {
  name: string;
  min: number;
  max: number;
  nameValid: boolean;
  rangeValid: boolean;
  valid: boolean;
} {
  const name = draft.name.trim();
  const min = Number(draft.min);
  const max = Number(draft.max);
  const nameValid = name.length > 0;
  const numbersValid =
    draft.min !== '' &&
    draft.max !== '' &&
    Number.isInteger(min) &&
    Number.isInteger(max);
  const rangeValid = numbersValid && min <= max;
  return {
    name,
    min,
    max,
    nameValid,
    rangeValid,
    valid: nameValid && rangeValid,
  };
}

interface Props {
  campaignId: string;
  /** Whether the viewer is the master and may create/edit/remove. */
  canManage?: boolean;
}

/**
 * "Atributos dos personagens" — lets the master define the per-campaign
 * character attributes (name + min/max). Create, edit and remove inline. The
 * attributes belong to the table, not to any character.
 */
export function CampaignAttributesSection({
  campaignId,
  canManage = false,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { list, loading, saving, error } = useAppSelector(
    (s) => s.campaignAttributes,
  );

  const [addDraft, setAddDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAttributes(campaignId));
    return () => {
      dispatch(clearAttributes());
    };
  }, [campaignId, dispatch]);

  const addState = useMemo(() => parseDraft(addDraft), [addDraft]);
  const editState = useMemo(() => parseDraft(editDraft), [editDraft]);

  const submitAdd = () => {
    if (!addState.valid || saving) return;
    dispatch(
      createAttribute({
        campaignId,
        input: {
          name: addState.name,
          minValue: addState.min,
          maxValue: addState.max,
        },
      }),
    )
      .unwrap()
      .then(() => setAddDraft(EMPTY_DRAFT))
      .catch(() => {
        /* error surfaced via the shared Alert */
      });
  };

  const startEdit = (attr: CampaignAttribute) => {
    dispatch(clearAttributesError());
    setConfirmId(null);
    setEditingId(attr.id);
    setEditDraft(toDraft(attr));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const submitEdit = (attributeId: string) => {
    if (!editState.valid || saving) return;
    dispatch(
      updateAttribute({
        campaignId,
        attributeId,
        input: {
          name: editState.name,
          minValue: editState.min,
          maxValue: editState.max,
        },
      }),
    )
      .unwrap()
      .then(() => cancelEdit())
      .catch(() => {
        /* error surfaced via the shared Alert */
      });
  };

  const confirmRemove = (attributeId: string) => {
    dispatch(removeAttribute({ campaignId, attributeId }))
      .unwrap()
      .then(() => setConfirmId(null))
      .catch(() => setConfirmId(null));
  };

  const renderDraftFields = (
    draft: Draft,
    setDraft: (d: Draft) => void,
    state: ReturnType<typeof parseDraft>,
  ) => (
    <Fields>
      <FormField
        label={t('campaign.attributes.fields.name')}
        error={
          draft.name && !state.nameValid
            ? t('campaign.attributes.validation.nameRequired')
            : undefined
        }
      >
        {(p) => (
          <Input
            {...p}
            value={draft.name}
            maxLength={60}
            placeholder={t('campaign.attributes.placeholders.name')}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        )}
      </FormField>
      <NarrowField
        label={t('campaign.attributes.fields.min')}
        error={
          draft.min && draft.max && !state.rangeValid
            ? t('campaign.attributes.validation.range')
            : undefined
        }
      >
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            value={draft.min}
            placeholder="0"
            onChange={(e) => setDraft({ ...draft, min: e.target.value })}
          />
        )}
      </NarrowField>
      <NarrowField label={t('campaign.attributes.fields.max')}>
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="numeric"
            value={draft.max}
            placeholder="10"
            onChange={(e) => setDraft({ ...draft, max: e.target.value })}
          />
        )}
      </NarrowField>
    </Fields>
  );

  return (
    <Section>
      <ChapterHeading
        eyebrow={t('campaign.attributes.eyebrow')}
        title={t('campaign.attributes.title')}
      />
      <p>{t('campaign.attributes.lead')}</p>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && list.length === 0 ? (
        <Loading block label={t('campaign.attributes.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<DiceIcon size={40} />}
          title={t('campaign.attributes.emptyTitle')}
          description={t('campaign.attributes.emptyDescription')}
        />
      ) : (
        <Rows>
          {list.map((attr) =>
            editingId === attr.id ? (
              <Row key={attr.id}>
                {renderDraftFields(editDraft, setEditDraft, editState)}
                <Actions>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={saving}
                    disabled={!editState.valid}
                    onClick={() => submitEdit(attr.id)}
                  >
                    {t('campaign.attributes.actions.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    {t('campaign.attributes.actions.cancel')}
                  </Button>
                </Actions>
              </Row>
            ) : (
              <Row key={attr.id}>
                <RowMain>
                  <AttrName>{attr.name}</AttrName>
                  <Badge $tone="neutral">
                    {t('campaign.attributes.range', {
                      min: attr.minValue,
                      max: attr.maxValue,
                    })}
                  </Badge>
                </RowMain>
                {canManage &&
                  (confirmId === attr.id ? (
                    <Actions>
                    <span>{t('campaign.attributes.confirmRemove')}</span>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={saving}
                      onClick={() => confirmRemove(attr.id)}
                    >
                      {t('campaign.attributes.actions.confirmYes')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmId(null)}
                    >
                      {t('campaign.attributes.actions.confirmNo')}
                    </Button>
                  </Actions>
                ) : (
                  <Actions>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(attr)}
                    >
                      {t('campaign.attributes.actions.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        dispatch(clearAttributesError());
                        setConfirmId(attr.id);
                      }}
                    >
                      {t('campaign.attributes.actions.remove')}
                    </Button>
                  </Actions>
                ))}
              </Row>
            ),
          )}
        </Rows>
      )}

      {canManage && (
        <>
          <Divider variant="ornament" />

          <ChapterHeading
            eyebrow={t('campaign.attributes.addEyebrow')}
            title={t('campaign.attributes.addTitle')}
          />
          <Row as="div">
            {renderDraftFields(addDraft, setAddDraft, addState)}
            <Actions>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<PlusIcon size={16} />}
                loading={saving && editingId === null && confirmId === null}
                disabled={!addState.valid}
                onClick={submitAdd}
              >
                {t('campaign.attributes.actions.add')}
              </Button>
            </Actions>
          </Row>
        </>
      )}
    </Section>
  );
}
