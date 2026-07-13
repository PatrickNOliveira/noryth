import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Modal,
  Button,
  Input,
  Textarea,
  Switch,
  Checkbox,
  FormField,
  Alert,
} from './ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAttributes } from '../store/slices/campaignAttributes.slice';
import { characterFormService } from '../services/characterForm.service';
import { abilityService } from '../services/ability.service';
import { resourceService } from '../services/resource.service';
import { CharacterForm } from '../types/characterForm';
import { AbilityDefinition } from '../types/ability';
import { ResourceDefinition } from '../types/resource';

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;
const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const GroupTitle = styled.h4`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.primary};
`;
const AttrRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const AttrName = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;
const NumInput = styled(Input)`
  max-width: 100px;
`;

interface Props {
  campaignId: string;
  characterId: string;
  form: CharacterForm | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (form: CharacterForm) => void;
}

export function CharacterFormModal({
  campaignId,
  characterId,
  form,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const attributes = useAppSelector((s) => s.campaignAttributes.list);

  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [appearance, setAppearance] = useState('');
  const [notes, setNotes] = useState('');
  const [usesBaseAbilities, setUsesBaseAbilities] = useState(true);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [abilityDefs, setAbilityDefs] = useState<AbilityDefinition[]>([]);
  const [selectedAbilities, setSelectedAbilities] = useState<Set<string>>(new Set());
  const [resourceDefs, setResourceDefs] = useState<ResourceDefinition[]>([]);
  // Per-resource max override for this form; empty string = no override (use base).
  const [resourceMax, setResourceMax] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchAttributes(campaignId));
    abilityService.list(campaignId).then(setAbilityDefs).catch(() => setAbilityDefs([]));
    resourceService.list(campaignId).then(setResourceDefs).catch(() => setResourceDefs([]));
    // Load this form's existing max overrides (only when editing an existing form).
    if (form) {
      resourceService
        .listForForm(campaignId, characterId, form.id)
        .then((rows) =>
          setResourceMax(
            Object.fromEntries(
              rows
                .filter((r) => r.maxValue != null)
                .map((r) => [r.resourceDefinitionId, String(r.maxValue)]),
            ),
          ),
        )
        .catch(() => setResourceMax({}));
    } else {
      setResourceMax({});
    }
    setName(form?.name ?? '');
    setShortDescription(form?.shortDescription ?? '');
    setAppearance(form?.appearanceDescription ?? '');
    setNotes(form?.notes ?? '');
    setUsesBaseAbilities(form?.usesBaseAbilities ?? true);
    setAttrValues(
      Object.fromEntries((form?.attributes ?? []).map((a) => [a.attributeId, String(a.value)])),
    );
    setSelectedAbilities(new Set((form?.abilities ?? []).map((a) => a.abilityDefinitionId)));
    setError(null);
  }, [isOpen, form, campaignId, dispatch]);

  const toggleAbility = (id: string) => {
    setSelectedAbilities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!appearance.trim()) {
      setError(t('characterForm.validation.appearanceRequired'));
      return;
    }
    if (!name.trim()) {
      setError(t('characterForm.validation.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const basic = {
        name: name.trim(),
        shortDescription: shortDescription.trim(),
        appearanceDescription: appearance.trim(),
        notes: notes.trim(),
        usesBaseAbilities,
      };
      let saved = form
        ? await characterFormService.update(campaignId, characterId, form.id, basic)
        : await characterFormService.create(campaignId, characterId, basic);

      const attrs = Object.entries(attrValues)
        .filter(([, raw]) => raw !== undefined && raw.trim() !== '' && !Number.isNaN(Number(raw)))
        .map(([attributeId, raw]) => ({ attributeId, value: Number(raw) }));
      saved = await characterFormService.updateAttributes(
        campaignId,
        characterId,
        saved.id,
        attrs,
      );
      saved = await characterFormService.updateAbilities(
        campaignId,
        characterId,
        saved.id,
        usesBaseAbilities,
        usesBaseAbilities ? [] : [...selectedAbilities],
      );
      // Persist per-resource max overrides (empty input = no override).
      if (resourceDefs.length > 0) {
        await resourceService.updateForForm(
          campaignId,
          characterId,
          saved.id,
          resourceDefs.map((d) => {
            const raw = resourceMax[d.id]?.trim();
            return {
              resourceDefinitionId: d.id,
              maxValue: raw && !Number.isNaN(Number(raw)) ? Number(raw) : null,
            };
          }),
        );
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? t('characterForm.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={form ? t('characterForm.editTitle') : t('characterForm.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('characterForm.cancel')}</Button>
          <Button onClick={save} loading={saving}>{t('characterForm.save')}</Button>
        </>
      }
    >
      <Body>
        {error && <Alert variant="error">{error}</Alert>}
        <FormField label={t('characterForm.fields.name')}>
          {({ id }) => (
            <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </FormField>
        <FormField label={t('characterForm.fields.shortDescription')}>
          {({ id }) => (
            <Input id={id} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          )}
        </FormField>
        <FormField label={t('characterForm.fields.appearance')} hint={t('characterForm.fields.appearanceHint')}>
          {({ id }) => (
            <Textarea id={id} value={appearance} onChange={(e) => setAppearance(e.target.value)} rows={4} />
          )}
        </FormField>
        <FormField label={t('characterForm.fields.notes')}>
          {({ id }) => (
            <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          )}
        </FormField>

        <Group>
          <GroupTitle>{t('characterForm.fields.attributes')}</GroupTitle>
          {attributes.length === 0 ? (
            <AttrName>{t('characterForm.noAttributes')}</AttrName>
          ) : (
            attributes.map((a) => (
              <AttrRow key={a.id}>
                <AttrName>
                  {a.name} <small>({a.minValue}–{a.maxValue})</small>
                </AttrName>
                <NumInput
                  type="number"
                  value={attrValues[a.id] ?? ''}
                  placeholder={t('characterForm.baseValue')}
                  onChange={(e) =>
                    setAttrValues((prev) => ({ ...prev, [a.id]: e.target.value }))
                  }
                />
              </AttrRow>
            ))
          )}
        </Group>

        <Group>
          <GroupTitle>{t('characterForm.fields.abilities')}</GroupTitle>
          <Switch
            label={t('characterForm.usesBaseAbilities')}
            checked={usesBaseAbilities}
            onChange={(e) => setUsesBaseAbilities(e.target.checked)}
          />
          {!usesBaseAbilities &&
            (abilityDefs.length === 0 ? (
              <AttrName>{t('characterForm.noAbilities')}</AttrName>
            ) : (
              abilityDefs.map((ab) => (
                <Checkbox
                  key={ab.id}
                  label={ab.name}
                  checked={selectedAbilities.has(ab.id)}
                  onChange={() => toggleAbility(ab.id)}
                />
              ))
            ))}
        </Group>

        {resourceDefs.length > 0 && (
          <Group>
            <GroupTitle>{t('characterForm.fields.resources')}</GroupTitle>
            {resourceDefs.map((r) => (
              <AttrRow key={r.id}>
                <AttrName>
                  {r.name} <small>({t('characterForm.resourceBaseHint')})</small>
                </AttrName>
                <NumInput
                  type="number"
                  inputMode="numeric"
                  value={resourceMax[r.id] ?? ''}
                  placeholder={String(r.defaultMaxValue)}
                  onChange={(e) =>
                    setResourceMax((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                />
              </AttrRow>
            ))}
          </Group>
        )}
      </Body>
    </Modal>
  );
}
