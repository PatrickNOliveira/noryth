import { useEffect, useState } from 'react';
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
import { Character } from '../types/character';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Submit = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

export interface PlayerCharacterFormResult {
  name: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  personality?: string;
  motivations?: string;
  secrets?: string;
  playerNotes?: string;
  factionId: string | null;
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
  onSubmit: (r: PlayerCharacterFormResult) => void;
  onCancel?: () => void;
}

const S = (v?: string | null) => v ?? '';

export function PlayerCharacterForm({
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

  useEffect(() => {
    dispatch(fetchFactions(campaignId));
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
  const [playerNotes, setPlayerNotes] = useState(S(initial?.playerNotes));
  const [factionId, setFactionId] = useState(S(initial?.factionId));
  const [generateImage, setGenerateImage] = useState(false);
  const [ignoreArt, setIgnoreArt] = useState(false);

  const nameValid = name.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid || saving) return;
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
      playerNotes: playerNotes.trim(),
      factionId: factionId || null,
      generateImage: mode === 'create' ? generateImage : undefined,
      ignoreCampaignArtDirection:
        mode === 'create' && generateImage ? ignoreArt : undefined,
    });
  };

  const text = (
    label: string,
    value: string,
    setter: (v: string) => void,
    hint?: string,
  ) => (
    <FormField label={label} hint={hint}>
      {(p) => <Textarea {...p} value={value} onChange={(e) => setter(e.target.value)} />}
    </FormField>
  );

  return (
    <Form onSubmit={submit} noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <Grid>
        <FormField
          label={t('character.fields.name')}
          required
          error={!nameValid && name.length > 0 ? t('character.validation.nameRequired') : undefined}
        >
          {(p) => <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField label={t('character.fields.title')}>
          {(p) => <Input {...p} value={title} maxLength={160} placeholder={t('character.placeholders.title')} onChange={(e) => setTitle(e.target.value)} />}
        </FormField>
        <FormField label={t('character.fields.shortDescription')}>
          {(p) => <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />}
        </FormField>
        {text(t('character.fields.appearance'), appearance, setAppearance, t('playerCharacter.form.appearanceHint'))}
        {text(t('character.fields.description'), description, setDescription)}
        {text(t('character.fields.personality'), personality, setPersonality)}
        {text(t('character.fields.motivations'), motivations, setMotivations)}
        {text(t('character.fields.history'), history, setHistory)}
        {text(t('character.fields.secrets'), secrets, setSecrets, t('playerCharacter.form.privateHint'))}
        {text(t('playerCharacter.fields.playerNotes'), playerNotes, setPlayerNotes, t('playerCharacter.form.privateHint'))}
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
      </Grid>

      {mode === 'create' && (
        <>
          <Switch label={t('character.fields.generateImage')} checked={generateImage} onChange={(e) => setGenerateImage(e.target.checked)} />
          {generateImage && (
            <Switch label={t('character.fields.ignoreArtDirection')} checked={ignoreArt} onChange={(e) => setIgnoreArt(e.target.checked)} />
          )}
        </>
      )}

      <Submit>
        <Button type="submit" loading={saving} disabled={!nameValid}>{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>{t('character.form.cancel')}</Button>
        )}
      </Submit>
    </Form>
  );
}
