import { useState } from 'react';
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
import { ItemDefinition, ITEM_TYPES } from '../types/item';

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

export interface ItemFormResult {
  name: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  appearance?: string;
  effectDescription?: string;
  rulesText?: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
  masterNotes?: string;
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
}

interface Props {
  mode: 'create' | 'edit';
  initial?: ItemDefinition;
  saving?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (r: ItemFormResult) => void;
  onCancel: () => void;
}

const S = (v?: string | null) => v ?? '';

export function ItemForm({
  mode,
  initial,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(S(initial?.name));
  const [type, setType] = useState(S(initial?.type));
  const [shortDescription, setShort] = useState(S(initial?.shortDescription));
  const [description, setDescription] = useState(S(initial?.description));
  const [history, setHistory] = useState(S(initial?.history));
  const [appearance, setAppearance] = useState(S(initial?.appearance));
  const [effectDescription, setEffect] = useState(S(initial?.effectDescription));
  const [rulesText, setRules] = useState(S(initial?.rulesText));
  const [isUnique, setIsUnique] = useState(initial?.isUnique ?? false);
  const [visible, setVisible] = useState(initial?.isVisibleToPlayers ?? false);
  const [masterNotes, setMasterNotes] = useState(S(initial?.masterNotes));
  const [generateImage, setGenerateImage] = useState(false);
  const [ignoreArt, setIgnoreArt] = useState(false);

  const nameValid = name.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid || saving) return;
    onSubmit({
      name: name.trim(),
      type: type || undefined,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      history: history.trim(),
      appearance: appearance.trim(),
      effectDescription: effectDescription.trim(),
      rulesText: rulesText.trim(),
      isUnique,
      isVisibleToPlayers: visible,
      masterNotes: masterNotes.trim(),
      generateImage: mode === 'create' ? generateImage : undefined,
      ignoreCampaignArtDirection:
        mode === 'create' && generateImage ? ignoreArt : undefined,
    });
  };

  const area = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <FormField label={label} hint={hint}>
      {(p) => <Textarea {...p} value={value} onChange={(e) => set(e.target.value)} />}
    </FormField>
  );

  return (
    <Form onSubmit={submit} noValidate>
      {error && <Alert variant="error">{error}</Alert>}
      <Grid>
        <FormField
          label={t('item.fields.name')}
          required
          error={!nameValid && name.length > 0 ? t('item.validation.nameRequired') : undefined}
        >
          {(p) => <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField label={t('item.fields.type')}>
          {(p) => (
            <Select {...p} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('item.fields.noType')}</option>
              {ITEM_TYPES.map((it) => (
                <option key={it} value={it}>{t(`item.type.${it}`)}</option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('item.fields.shortDescription')}>
          {(p) => <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />}
        </FormField>
        {area(t('item.fields.description'), description, setDescription)}
        {area(t('item.fields.appearance'), appearance, setAppearance, t('item.hints.appearance'))}
        {area(t('item.fields.history'), history, setHistory)}
        {area(t('item.fields.effectDescription'), effectDescription, setEffect)}
        {area(t('item.fields.rulesText'), rulesText, setRules)}
        {area(t('item.fields.masterNotes'), masterNotes, setMasterNotes, t('item.hints.masterOnly'))}
      </Grid>

      <Switch label={t('item.fields.isUnique')} checked={isUnique} onChange={(e) => setIsUnique(e.target.checked)} />
      <Switch label={t('item.fields.visible')} checked={visible} onChange={(e) => setVisible(e.target.checked)} />

      {mode === 'create' && (
        <>
          <Switch label={t('item.fields.generateImage')} checked={generateImage} onChange={(e) => setGenerateImage(e.target.checked)} />
          {generateImage && (
            <Switch label={t('item.fields.ignoreArtDirection')} checked={ignoreArt} onChange={(e) => setIgnoreArt(e.target.checked)} />
          )}
        </>
      )}

      <Submit>
        <Button type="submit" loading={saving} disabled={!nameValid}>{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t('item.form.cancel')}</Button>
      </Submit>
    </Form>
  );
}
