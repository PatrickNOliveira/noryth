import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Alert,
  Button,
  FormField,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
  useToast,
} from '../ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFactions } from '../../store/slices/factions.slice';
import { fetchAttributes } from '../../store/slices/campaignAttributes.slice';
import { sessionService } from '../../services/session.service';
import {
  Character,
  CompleteImprovisedCharacterInput,
  CreateCharacterInput,
  ImprovisePartialCharacterInput,
} from '../../types/character';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

interface Props {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called with the created character; `addToMap` reflects the master's choice. */
  onCreated: (character: Character, addToMap: boolean) => void;
}

/** Trimmed value or empty string. */
const T = (v: string) => v.trim();
const isEmpty = (v: string) => T(v).length === 0;

/**
 * Create a character on the spot during a live session. Two paths: fill the
 * fields manually, or let the AI complete the blanks (the master's typed fields
 * are never overwritten — enforced here AND on the backend). The created
 * character is a normal campaign character; its portrait generates async.
 */
export function CreateSessionCharacterModal({
  campaignId,
  isOpen,
  onClose,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const factions = useAppSelector((s) => s.factions.list);
  const attributes = useAppSelector((s) => s.campaignAttributes.list);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [shortDescription, setShort] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState('');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [motivations, setMotivations] = useState('');
  const [secrets, setSecrets] = useState('');
  const [notes, setNotes] = useState('');
  const [factionId, setFactionId] = useState('');
  const [visible, setVisible] = useState(false);
  const [addToMap, setAddToMap] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  const [aiLoading, setAiLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiController = useRef<AbortController | null>(null);

  // Reset everything each time the modal opens; fetch the campaign's factions
  // and attributes so the selectors/inputs are ready.
  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setTitle('');
    setShort('');
    setDescription('');
    setHistory('');
    setAppearance('');
    setPersonality('');
    setMotivations('');
    setSecrets('');
    setNotes('');
    setFactionId('');
    setVisible(false);
    setAddToMap(false);
    setInstructions('');
    setAttrValues({});
    setError(null);
    setAiLoading(false);
    setCreating(false);
    dispatch(fetchFactions(campaignId));
    dispatch(fetchAttributes(campaignId));
  }, [isOpen, campaignId, dispatch]);

  // Abort any in-flight AI request when the modal closes/unmounts.
  useEffect(() => {
    if (!isOpen) aiController.current?.abort();
    return () => aiController.current?.abort();
  }, [isOpen]);

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

  const nameValid = !isEmpty(name);
  const valid = nameValid && Object.keys(attrErrors).length === 0;
  const busy = aiLoading || creating;

  /** Current attribute values as {attributeId, value}, skipping empties/invalids. */
  const collectAttributes = () =>
    attributes
      .map((attr) => ({ attributeId: attr.id, raw: attrValues[attr.id] }))
      .filter((a) => a.raw !== undefined && a.raw !== '' && !attrErrors[a.attributeId])
      .map((a) => ({ attributeId: a.attributeId, value: Number(a.raw) }));

  /** Only the fields the master actually filled — the AI fills the rest. */
  const collectPartial = (): ImprovisePartialCharacterInput => {
    const p: ImprovisePartialCharacterInput = {};
    if (!isEmpty(name)) p.name = T(name);
    if (!isEmpty(title)) p.title = T(title);
    if (!isEmpty(shortDescription)) p.shortDescription = T(shortDescription);
    if (!isEmpty(description)) p.description = T(description);
    if (!isEmpty(history)) p.history = T(history);
    if (!isEmpty(appearance)) p.appearance = T(appearance);
    if (!isEmpty(personality)) p.personality = T(personality);
    if (!isEmpty(motivations)) p.motivations = T(motivations);
    if (!isEmpty(secrets)) p.secrets = T(secrets);
    if (!isEmpty(notes)) p.notes = T(notes);
    if (factionId) p.factionId = factionId;
    const attrs = collectAttributes();
    if (attrs.length) p.attributes = attrs;
    return p;
  };

  // "Complete with AI": ask the backend to fill the gaps, then merge into EMPTY
  // fields only. A field the master typed is never overwritten here (the backend
  // guarantees the same). Guards against double-clicks and cancels a prior call.
  const completeWithAi = async () => {
    if (busy) return;
    aiController.current?.abort();
    const controller = new AbortController();
    aiController.current = controller;
    setAiLoading(true);
    setError(null);
    const input: CompleteImprovisedCharacterInput = {
      character: collectPartial(),
      instructions: T(instructions) || undefined,
    };
    try {
      const draft = await sessionService.aiCompleteImprovisedCharacter(
        campaignId,
        input,
        controller.signal,
      );
      // Fill only what is still empty — never clobber the master's own text.
      setName((v) => (isEmpty(v) ? draft.name : v));
      setTitle((v) => (isEmpty(v) ? draft.title : v));
      setShort((v) => (isEmpty(v) ? draft.shortDescription : v));
      setDescription((v) => (isEmpty(v) ? draft.description : v));
      setHistory((v) => (isEmpty(v) ? draft.history : v));
      setAppearance((v) => (isEmpty(v) ? draft.appearance : v));
      setPersonality((v) => (isEmpty(v) ? draft.personality : v));
      setMotivations((v) => (isEmpty(v) ? draft.motivations : v));
      setSecrets((v) => (isEmpty(v) ? draft.secrets : v));
      setNotes((v) => (isEmpty(v) ? draft.notes : v));
      setFactionId((v) => (v ? v : draft.factionId ?? ''));
      setAttrValues((prev) => {
        const next = { ...prev };
        for (const a of draft.attributes) {
          if (next[a.attributeId] === undefined || next[a.attributeId] === '') {
            next[a.attributeId] = String(a.value);
          }
        }
        return next;
      });
      notify(t('session.createCharacter.aiDone'), { variant: 'success' });
    } catch (err) {
      if ((err as { message?: string })?.message === 'canceled') return;
      setError(t('session.createCharacter.aiError'));
    } finally {
      if (aiController.current === controller) {
        aiController.current = null;
        setAiLoading(false);
      }
    }
  };

  // Create the character (normal campaign character; portrait generates async).
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return;
    setCreating(true);
    setError(null);
    const input: CreateCharacterInput = {
      name: T(name),
      title: T(title),
      shortDescription: T(shortDescription),
      description: T(description),
      history: T(history),
      appearance: T(appearance),
      personality: T(personality),
      motivations: T(motivations),
      secrets: T(secrets),
      notes: T(notes),
      factionId: factionId || null,
      isVisibleToPlayers: visible,
      attributes: collectAttributes(),
      generateImage: true,
    };
    try {
      const created = await sessionService.createImprovisedCharacter(
        campaignId,
        input,
      );
      onCreated(created, addToMap);
    } catch {
      setError(t('session.createCharacter.createError'));
      setCreating(false);
    }
  };

  const longFields = [
    ['description', description, setDescription],
    ['history', history, setHistory],
    ['appearance', appearance, setAppearance],
    ['personality', personality, setPersonality],
    ['motivations', motivations, setMotivations],
    ['secrets', secrets, setSecrets],
    ['notes', notes, setNotes],
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('session.createCharacter.title')}
      size="lg"
    >
      <Form onSubmit={submit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <Chapter>
          <FormField label={t('session.createCharacter.ideaLabel')} hint={t('session.createCharacter.ideaHint')}>
            {(p) => (
              <Textarea
                {...p}
                value={instructions}
                placeholder={t('session.createCharacter.ideaPlaceholder')}
                onChange={(e) => setInstructions(e.target.value)}
              />
            )}
          </FormField>
          <Actions>
            <Button
              type="button"
              variant="secondary"
              loading={aiLoading}
              disabled={creating}
              onClick={completeWithAi}
            >
              {t('session.createCharacter.completeWithAi')}
            </Button>
          </Actions>
        </Chapter>

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
                <Input {...p} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
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
            {longFields.map(([key, value, setter]) => (
              <FormField
                key={key}
                label={t(`character.fields.${key}`)}
                hint={key === 'secrets' || key === 'notes' ? t('character.hints.masterOnly') : undefined}
              >
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

        <Switch
          label={t('session.createCharacter.addToMap')}
          checked={addToMap}
          onChange={(e) => setAddToMap(e.target.checked)}
        />

        <Actions>
          <Button type="submit" loading={creating} disabled={!valid || aiLoading}>
            {t('session.createCharacter.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('session.createCharacter.cancel')}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
