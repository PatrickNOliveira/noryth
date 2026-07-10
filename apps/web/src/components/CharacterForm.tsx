import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Alert,
  Button,
  FormField,
  Input,
  Textarea,
  Select,
  Switch,
} from './ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchFactions } from '../store/slices/factions.slice';
import { fetchAttributes } from '../store/slices/campaignAttributes.slice';
import { Character, CreateCharacterInput } from '../types/character';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const AttrGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Submit = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

export interface CharacterFormResult {
  name: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  personality?: string;
  motivations?: string;
  secrets?: string;
  notes?: string;
  factionId: string | null;
  isVisibleToPlayers: boolean;
  attributes: { attributeId: string; value: number }[];
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
}

interface Props {
  campaignId: string;
  mode: 'create' | 'edit';
  initial?: Character;
  saving?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (result: CharacterFormResult) => void;
  onCancel: () => void;
}

const S = (v?: string | null) => v ?? '';

export function CharacterForm({
  campaignId,
  mode,
  initial,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const factions = useAppSelector((s) => s.factions.list);
  const attributes = useAppSelector((s) => s.campaignAttributes.list);

  useEffect(() => {
    dispatch(fetchFactions(campaignId));
    dispatch(fetchAttributes(campaignId));
  }, [campaignId, dispatch]);

  const [name, setName] = useState(S(initial?.name));
  const [title, setTitle] = useState(S(initial?.title));
  const [shortDescription, setShort] = useState(S(initial?.shortDescription));
  const [description, setDescription] = useState(S(initial?.description));
  const [history, setHistory] = useState(S(initial?.history));
  const [appearance, setAppearance] = useState(S(initial?.appearance));
  const [personality, setPersonality] = useState(S(initial?.personality));
  const [motivations, setMotivations] = useState(S(initial?.motivations));
  const [secrets, setSecrets] = useState(S(initial?.secrets));
  const [notes, setNotes] = useState(S(initial?.masterNotes));
  const [factionId, setFactionId] = useState(S(initial?.factionId));
  const [visible, setVisible] = useState(initial?.isVisibleToPlayers ?? false);
  const [generateImage, setGenerateImage] = useState(false);
  const [ignoreArt, setIgnoreArt] = useState(false);

  // attributeId → raw string value
  const [attrValues, setAttrValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    initial?.attributes.forEach((a) => (map[a.attributeId] = String(a.value)));
    return map;
  });

  const nameValid = name.trim().length > 0;

  const attrErrors = useMemo(() => {
    const errs: Record<string, boolean> = {};
    for (const attr of attributes) {
      const raw = attrValues[attr.id];
      if (raw === undefined || raw === '') continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < attr.minValue || n > attr.maxValue) {
        errs[attr.id] = true;
      }
    }
    return errs;
  }, [attributes, attrValues]);

  const valid = nameValid && Object.keys(attrErrors).length === 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    const attrs = attributes
      .map((attr) => ({ attributeId: attr.id, raw: attrValues[attr.id] }))
      .filter((a) => a.raw !== undefined && a.raw !== '')
      .map((a) => ({ attributeId: a.attributeId, value: Number(a.raw) }));

    onSubmit({
      name: name.trim(),
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      history: history.trim(),
      appearance: appearance.trim(),
      personality: personality.trim(),
      motivations: motivations.trim(),
      secrets: secrets.trim(),
      notes: notes.trim(),
      factionId: factionId || null,
      isVisibleToPlayers: visible,
      attributes: attrs,
      generateImage: mode === 'create' ? generateImage : undefined,
      ignoreCampaignArtDirection:
        mode === 'create' && generateImage ? ignoreArt : undefined,
    });
  };

  return (
    <Form onSubmit={submit} noValidate>
      {error && <Alert variant="error">{error}</Alert>}

      <Chapter>
        <Grid>
          <FormField
            label={t('character.fields.name')}
            required
            error={!nameValid && name.length > 0 ? t('character.validation.nameRequired') : undefined}
          >
            {(p) => (
              <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            )}
          </FormField>
          <FormField label={t('character.fields.title')}>
            {(p) => (
              <Input {...p} value={title} maxLength={160} placeholder={t('character.placeholders.title')} onChange={(e) => setTitle(e.target.value)} />
            )}
          </FormField>
          <FormField label={t('character.fields.shortDescription')}>
            {(p) => (
              <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />
            )}
          </FormField>
        </Grid>
      </Chapter>

      <Chapter>
        <Grid>
          {(
            [
              ['description', description, setDescription],
              ['history', history, setHistory],
              ['appearance', appearance, setAppearance],
              ['personality', personality, setPersonality],
              ['motivations', motivations, setMotivations],
              ['secrets', secrets, setSecrets],
              ['notes', notes, setNotes],
            ] as const
          ).map(([key, value, setter]) => (
            <FormField key={key} label={t(`character.fields.${key}`)} hint={key === 'secrets' || key === 'notes' ? t('character.hints.masterOnly') : undefined}>
              {(p) => (
                <Textarea {...p} value={value} onChange={(e) => setter(e.target.value)} />
              )}
            </FormField>
          ))}
        </Grid>
      </Chapter>

      <Chapter>
        <Grid>
          <FormField label={t('character.fields.faction')}>
            {(p) => (
              <Select {...p} value={factionId} onChange={(e) => setFactionId(e.target.value)}>
                <option value="">{t('character.fields.noFaction')}</option>
                {factions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            )}
          </FormField>
          <Switch
            label={t('character.fields.visible')}
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
        </Grid>
      </Chapter>

      {attributes.length > 0 && (
        <Chapter>
          <AttrGrid>
            {attributes.map((attr) => (
              <FormField
                key={attr.id}
                label={attr.name}
                hint={`${attr.minValue}–${attr.maxValue}`}
                error={attrErrors[attr.id] ? t('character.validation.attrRange', { min: attr.minValue, max: attr.maxValue }) : undefined}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    value={attrValues[attr.id] ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      setAttrValues((prev) => ({ ...prev, [attr.id]: e.target.value }))
                    }
                  />
                )}
              </FormField>
            ))}
          </AttrGrid>
        </Chapter>
      )}

      {mode === 'create' && (
        <>
          <Switch
            label={t('character.fields.generateImage')}
            checked={generateImage}
            onChange={(e) => setGenerateImage(e.target.checked)}
          />
          {generateImage && (
            <Switch
              label={t('character.fields.ignoreArtDirection')}
              checked={ignoreArt}
              onChange={(e) => setIgnoreArt(e.target.checked)}
            />
          )}
        </>
      )}

      <Submit>
        <Button type="submit" loading={saving} disabled={!valid}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('character.form.cancel')}
        </Button>
      </Submit>
    </Form>
  );
}

/** Narrows the form result to the create input shape. */
export function toCreateInput(r: CharacterFormResult): CreateCharacterInput {
  return { ...r };
}
