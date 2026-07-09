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
import { fetchMaps } from '../store/slices/maps.slice';
import { CampaignMap, MAP_TYPES } from '../types/map';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
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

export interface MapFormResult {
  name: string;
  type?: string;
  parentMapId: string | null;
  shortDescription?: string;
  description?: string;
  history?: string;
  notes?: string;
  artDirection?: string;
  isVisibleToPlayers: boolean;
  generateImage?: boolean;
  ignoreCampaignArtDirection?: boolean;
  includeLabels?: boolean;
}

interface Props {
  campaignId: string;
  mode: 'create' | 'edit';
  initial?: CampaignMap;
  saving?: boolean;
  error?: string | null;
  submitLabel: string;
  onSubmit: (result: MapFormResult) => void;
  onCancel: () => void;
}

const S = (v?: string | null) => v ?? '';

export function MapForm({
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
  const maps = useAppSelector((s) => s.maps.list);

  useEffect(() => {
    dispatch(fetchMaps(campaignId));
  }, [campaignId, dispatch]);

  const [name, setName] = useState(S(initial?.name));
  const [type, setType] = useState(S(initial?.type));
  const [parentMapId, setParentMapId] = useState(S(initial?.parentMapId));
  const [shortDescription, setShort] = useState(S(initial?.shortDescription));
  const [description, setDescription] = useState(S(initial?.description));
  const [history, setHistory] = useState(S(initial?.history));
  const [notes, setNotes] = useState(S(initial?.notes));
  const [artDirection, setArtDirection] = useState(S(initial?.artDirection));
  const [visible, setVisible] = useState(initial?.isVisibleToPlayers ?? false);
  const [generateImage, setGenerateImage] = useState(false);
  const [ignoreArt, setIgnoreArt] = useState(false);
  const [includeLabels, setIncludeLabels] = useState(false);

  const nameValid = name.trim().length > 0;
  const parentOptions = maps.filter((m) => m.id !== initial?.id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid || saving) return;
    onSubmit({
      name: name.trim(),
      type: type || undefined,
      parentMapId: parentMapId || null,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      history: history.trim(),
      notes: notes.trim(),
      artDirection: artDirection.trim(),
      isVisibleToPlayers: visible,
      generateImage: mode === 'create' ? generateImage : undefined,
      ignoreCampaignArtDirection:
        mode === 'create' && generateImage ? ignoreArt : undefined,
      includeLabels:
        mode === 'create' && generateImage ? includeLabels : undefined,
    });
  };

  return (
    <Form onSubmit={submit} noValidate>
      {error && <Alert variant="error">{error}</Alert>}

      <Grid>
        <FormField
          label={t('map.fields.name')}
          required
          error={!nameValid && name.length > 0 ? t('map.validation.nameRequired') : undefined}
        >
          {(p) => <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}
        </FormField>
        <FormField label={t('map.fields.type')}>
          {(p) => (
            <Select {...p} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t('map.fields.noType')}</option>
              {MAP_TYPES.map((mt) => (
                <option key={mt} value={mt}>{t(`map.type.${mt}`)}</option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('map.fields.parent')} hint={t('map.fields.parentHint')}>
          {(p) => (
            <Select {...p} value={parentMapId} onChange={(e) => setParentMapId(e.target.value)}>
              <option value="">{t('map.fields.noParent')}</option>
              {parentOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label={t('map.fields.shortDescription')}>
          {(p) => <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />}
        </FormField>
      </Grid>

      <Grid>
        <FormField label={t('map.fields.description')}>
          {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </FormField>
        <FormField label={t('map.fields.history')}>
          {(p) => <Textarea {...p} value={history} onChange={(e) => setHistory(e.target.value)} />}
        </FormField>
        <FormField label={t('map.fields.notes')} hint={t('map.hints.masterOnly')}>
          {(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </FormField>
        <FormField label={t('map.fields.artDirection')} hint={t('map.hints.artDirection')}>
          {(p) => <Textarea {...p} value={artDirection} onChange={(e) => setArtDirection(e.target.value)} />}
        </FormField>
      </Grid>

      <Switch
        label={t('map.fields.visible')}
        checked={visible}
        onChange={(e) => setVisible(e.target.checked)}
      />

      {mode === 'create' && (
        <>
          <Switch
            label={t('map.fields.generateImage')}
            checked={generateImage}
            onChange={(e) => setGenerateImage(e.target.checked)}
          />
          {generateImage && (
            <>
              <Switch
                label={t('map.fields.ignoreArtDirection')}
                checked={ignoreArt}
                onChange={(e) => setIgnoreArt(e.target.checked)}
              />
              <Switch
                label={t('map.fields.includeLabels')}
                checked={includeLabels}
                onChange={(e) => setIncludeLabels(e.target.checked)}
              />
            </>
          )}
        </>
      )}

      <Submit>
        <Button type="submit" loading={saving} disabled={!nameValid}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('map.form.cancel')}
        </Button>
      </Submit>
    </Form>
  );
}
