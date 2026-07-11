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
import { AbilityDefinition, ABILITY_TYPES } from '../types/ability';

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

export interface AbilityFormResult {
  name: string;
  type?: string;
  shortDescription?: string;
  description?: string;
  history?: string;
  effectDescription?: string;
  rulesText?: string;
  costDescription?: string;
  limitationDescription?: string;
  isUnique: boolean;
  isVisibleToPlayers: boolean;
  masterNotes?: string;
}

interface Props {
  variant: 'master' | 'proposal';
  initial?: AbilityDefinition;
  saving?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (r: AbilityFormResult) => void;
  onCancel: () => void;
}

const S = (v?: string | null) => v ?? '';

export function AbilityForm({
  variant,
  initial,
  saving,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const isMaster = variant === 'master';
  const [name, setName] = useState(S(initial?.name));
  const [type, setType] = useState(S(initial?.type));
  const [shortDescription, setShort] = useState(S(initial?.shortDescription));
  const [description, setDescription] = useState(S(initial?.description));
  const [history, setHistory] = useState(S(initial?.history));
  const [effectDescription, setEffect] = useState(S(initial?.effectDescription));
  const [rulesText, setRules] = useState(S(initial?.rulesText));
  const [costDescription, setCost] = useState(S(initial?.costDescription));
  const [limitationDescription, setLimit] = useState(S(initial?.limitationDescription));
  const [isUnique, setIsUnique] = useState(initial?.isUnique ?? false);
  const [visible, setVisible] = useState(initial?.isVisibleToPlayers ?? false);
  const [masterNotes, setMasterNotes] = useState(S(initial?.masterNotes));

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
      effectDescription: effectDescription.trim(),
      rulesText: rulesText.trim(),
      costDescription: costDescription.trim(),
      limitationDescription: limitationDescription.trim(),
      isUnique,
      isVisibleToPlayers: visible,
      masterNotes: isMaster ? masterNotes.trim() : undefined,
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
          label={t('ability.fields.name')}
          required
          error={!nameValid && name.length > 0 ? t('ability.validation.nameRequired') : undefined}
        >
          {(p) => <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField label={t('ability.fields.type')}>
          {(p) => (
            <Select {...p} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('ability.fields.noType')}</option>
              {ABILITY_TYPES.map((it) => (
                <option key={it} value={it}>{t(`ability.type.${it}`)}</option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('ability.fields.shortDescription')}>
          {(p) => <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />}
        </FormField>
        {area(t('ability.fields.description'), description, setDescription)}
        {area(t('ability.fields.effectDescription'), effectDescription, setEffect)}
        {area(t('ability.fields.rulesText'), rulesText, setRules)}
        {area(t('ability.fields.costDescription'), costDescription, setCost)}
        {area(t('ability.fields.limitationDescription'), limitationDescription, setLimit)}
        {area(t('ability.fields.history'), history, setHistory)}
        {isMaster && area(t('ability.fields.masterNotes'), masterNotes, setMasterNotes, t('ability.hints.masterOnly'))}
      </Grid>

      <Switch label={t('ability.fields.isUnique')} checked={isUnique} onChange={(e) => setIsUnique(e.target.checked)} />
      <Switch label={t('ability.fields.visible')} checked={visible} onChange={(e) => setVisible(e.target.checked)} />

      <Submit>
        <Button type="submit" loading={saving} disabled={!nameValid}>{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t('ability.form.cancel')}</Button>
      </Submit>
    </Form>
  );
}
