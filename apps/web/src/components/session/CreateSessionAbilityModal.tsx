import { useEffect, useRef, useState } from 'react';
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
import { sessionService } from '../../services/session.service';
import {
  ABILITY_TYPES,
  CompleteImprovisedAbilityInput,
  CreateSessionAbilityInput,
  ImprovisePartialAbilityInput,
  SessionAbilityLink,
  SessionAbilityLinkTarget,
  SessionAbilityResult,
} from '../../types/ability';

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

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

/** Focused character passed from the session (when one is selected on the map). */
export interface AbilityTargetCharacter {
  id: string;
  name: string;
  activeForm: { id: string; name: string } | null;
}

interface Props {
  campaignId: string;
  selectedCharacter: AbilityTargetCharacter | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (result: SessionAbilityResult) => void;
}

const T = (v: string) => v.trim();
const isEmpty = (v: string) => T(v).length === 0;

/**
 * Create an ability on the spot during a live session. Two paths: fill manually,
 * or let the AI complete the blanks (the master's typed fields are never
 * overwritten — enforced here AND on the backend). The ability is a normal
 * campaign ability, born APPROVED, and can optionally be linked to the focused
 * character or its active form.
 */
export function CreateSessionAbilityModal({
  campaignId,
  selectedCharacter,
  isOpen,
  onClose,
  onCreated,
}: Props) {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [shortDescription, setShort] = useState('');
  const [description, setDescription] = useState('');
  const [effectDescription, setEffect] = useState('');
  const [rulesText, setRules] = useState('');
  const [costDescription, setCost] = useState('');
  const [limitationDescription, setLimit] = useState('');
  const [masterNotes, setMasterNotes] = useState('');
  const [isUnique, setIsUnique] = useState(false);
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [linkTarget, setLinkTarget] = useState<SessionAbilityLinkTarget>('NONE');

  const [aiLoading, setAiLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setType('');
    setShort('');
    setDescription('');
    setEffect('');
    setRules('');
    setCost('');
    setLimit('');
    setMasterNotes('');
    setIsUnique(false);
    setVisible(false);
    setInstructions('');
    setLinkTarget('NONE');
    setError(null);
    setAiLoading(false);
    setCreating(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) aiController.current?.abort();
    return () => aiController.current?.abort();
  }, [isOpen]);

  const nameValid = !isEmpty(name);
  const valid = nameValid;
  const busy = aiLoading || creating;

  const collectPartial = (): ImprovisePartialAbilityInput => {
    const p: ImprovisePartialAbilityInput = {
      // Booleans stay master-controlled; send them so the AI never flips them.
      isUnique,
      isVisibleToPlayers: visible,
    };
    if (!isEmpty(name)) p.name = T(name);
    if (!isEmpty(type)) p.type = T(type);
    if (!isEmpty(shortDescription)) p.shortDescription = T(shortDescription);
    if (!isEmpty(description)) p.description = T(description);
    if (!isEmpty(effectDescription)) p.effectDescription = T(effectDescription);
    if (!isEmpty(rulesText)) p.rulesText = T(rulesText);
    if (!isEmpty(costDescription)) p.costDescription = T(costDescription);
    if (!isEmpty(limitationDescription)) {
      p.limitationDescription = T(limitationDescription);
    }
    if (!isEmpty(masterNotes)) p.masterNotes = T(masterNotes);
    return p;
  };

  const completeWithAi = async () => {
    if (busy) return;
    aiController.current?.abort();
    const controller = new AbortController();
    aiController.current = controller;
    setAiLoading(true);
    setError(null);
    const input: CompleteImprovisedAbilityInput = {
      ability: collectPartial(),
      instructions: T(instructions) || undefined,
      characterId: selectedCharacter?.id,
      targetLanguage: i18n.language,
    };
    try {
      const draft = await sessionService.aiCompleteImprovisedAbility(
        campaignId,
        input,
        controller.signal,
      );
      setName((v) => (isEmpty(v) ? draft.name : v));
      setType((v) => (isEmpty(v) ? draft.type : v));
      setShort((v) => (isEmpty(v) ? draft.shortDescription : v));
      setDescription((v) => (isEmpty(v) ? draft.description : v));
      setEffect((v) => (isEmpty(v) ? draft.effectDescription : v));
      setRules((v) => (isEmpty(v) ? draft.rulesText : v));
      setCost((v) => (isEmpty(v) ? draft.costDescription : v));
      setLimit((v) => (isEmpty(v) ? draft.limitationDescription : v));
      setMasterNotes((v) => (isEmpty(v) ? draft.masterNotes : v));
      // Booleans stay master-controlled — the AI never changes the switches.
      notify(t('session.createAbility.aiDone'), { variant: 'success' });
    } catch (err) {
      if ((err as { message?: string })?.message === 'canceled') return;
      setError(t('session.createAbility.aiError'));
    } finally {
      if (aiController.current === controller) {
        aiController.current = null;
        setAiLoading(false);
      }
    }
  };

  const buildLink = (): SessionAbilityLink | undefined => {
    if (linkTarget === 'NONE' || !selectedCharacter) return undefined;
    return {
      target: linkTarget,
      characterId: selectedCharacter.id,
      formId:
        linkTarget === 'ACTIVE_FORM'
          ? selectedCharacter.activeForm?.id ?? null
          : null,
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return;
    setCreating(true);
    setError(null);
    const input: CreateSessionAbilityInput = {
      ability: {
        name: T(name),
        type: T(type),
        shortDescription: T(shortDescription),
        description: T(description),
        effectDescription: T(effectDescription),
        rulesText: T(rulesText),
        costDescription: T(costDescription),
        limitationDescription: T(limitationDescription),
        masterNotes: T(masterNotes),
        isUnique,
        isVisibleToPlayers: visible,
      },
      link: buildLink(),
    };
    try {
      const result = await sessionService.createImprovisedAbility(campaignId, input);
      onCreated(result);
    } catch {
      setError(t('session.createAbility.createError'));
      setCreating(false);
    }
  };

  const longFields = [
    ['description', description, setDescription, undefined],
    ['effectDescription', effectDescription, setEffect, undefined],
    ['rulesText', rulesText, setRules, undefined],
    ['costDescription', costDescription, setCost, undefined],
    ['limitationDescription', limitationDescription, setLimit, undefined],
    ['masterNotes', masterNotes, setMasterNotes, t('ability.hints.masterOnly')],
  ] as const;

  const canLink = !!selectedCharacter;
  const canLinkForm = !!selectedCharacter?.activeForm;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('session.createAbility.title')}
      size="lg"
    >
      <Form onSubmit={submit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <Chapter>
          <FormField label={t('session.createAbility.ideaLabel')} hint={t('session.createAbility.ideaHint')}>
            {(p) => (
              <Textarea
                {...p}
                value={instructions}
                placeholder={t('session.createAbility.ideaPlaceholder')}
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
              {t('session.createAbility.completeWithAi')}
            </Button>
          </Actions>
        </Chapter>

        <Chapter>
          <Grid>
            <FormField
              label={t('ability.fields.name')}
              required
              error={!nameValid && name.length > 0 ? t('ability.validation.nameRequired') : undefined}
            >
              {(p) => (
                <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              )}
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
              {(p) => (
                <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />
              )}
            </FormField>
          </Grid>
        </Chapter>

        <Chapter>
          <Grid>
            {longFields.map(([key, value, setter, hint]) => (
              <FormField key={key} label={t(`ability.fields.${key}`)} hint={hint}>
                {(p) => (
                  <Textarea {...p} value={value} onChange={(e) => setter(e.target.value)} />
                )}
              </FormField>
            ))}
          </Grid>
          <Switch
            label={t('ability.fields.isUnique')}
            checked={isUnique}
            onChange={(e) => setIsUnique(e.target.checked)}
          />
          <Switch
            label={t('ability.fields.visible')}
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
        </Chapter>

        {canLink && (
          <Chapter>
            <FormField label={t('session.createAbility.linkLabel')}>
              {(p) => (
                <Select
                  {...p}
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(e.target.value as SessionAbilityLinkTarget)}
                >
                  <option value="NONE">{t('session.createAbility.linkNone')}</option>
                  <option value="CHARACTER">
                    {t('session.createAbility.linkCharacter', { name: selectedCharacter!.name })}
                  </option>
                  {canLinkForm && (
                    <option value="ACTIVE_FORM">
                      {t('session.createAbility.linkActiveForm', {
                        form: selectedCharacter!.activeForm!.name,
                      })}
                    </option>
                  )}
                </Select>
              )}
            </FormField>
            {linkTarget === 'ACTIVE_FORM' && (
              <Hint>{t('session.createAbility.activeFormWarning')}</Hint>
            )}
          </Chapter>
        )}

        <Actions>
          <Button type="submit" loading={creating} disabled={!valid || aiLoading}>
            {t('session.createAbility.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('session.createAbility.cancel')}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
