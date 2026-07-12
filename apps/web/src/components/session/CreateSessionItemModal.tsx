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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCharacters } from '../../store/slices/characters.slice';
import { sessionService } from '../../services/session.service';
import {
  CompleteImprovisedItemInput,
  CreateSessionItemInput,
  ImprovisePartialItemInput,
  ITEM_STATES,
  ITEM_TYPES,
  SessionItemInstanceInput,
  SessionItemResult,
} from '../../types/item';

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

const InstanceBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

type LocationKind = 'unplaced' | 'currentMap' | 'point' | 'character';

interface Props {
  campaignId: string;
  currentMapId: string | null;
  mapPoints: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onCreated: (result: SessionItemResult) => void;
}

const T = (v: string) => v.trim();
const isEmpty = (v: string) => T(v).length === 0;

/**
 * Create an item on the spot during a live session. Two paths: fill the fields
 * manually, or let the AI complete the blanks (the master's typed fields are
 * never overwritten — enforced here AND on the backend). Optionally spawns a
 * first occurrence (instance) on the current map, a point of interest or a
 * character. The item is a normal campaign item; its image generates async.
 */
export function CreateSessionItemModal({
  campaignId,
  currentMapId,
  mapPoints,
  isOpen,
  onClose,
  onCreated,
}: Props) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const characters = useAppSelector((s) => s.characters.list);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [shortDescription, setShort] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState('');
  const [appearance, setAppearance] = useState('');
  const [effectDescription, setEffect] = useState('');
  const [rulesText, setRules] = useState('');
  const [masterNotes, setMasterNotes] = useState('');
  const [isUnique, setIsUnique] = useState(false);
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState('');

  // Optional first occurrence.
  const [createInstance, setCreateInstance] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [state, setState] = useState<string>('HIDDEN');
  const [location, setLocation] = useState<LocationKind>('currentMap');
  const [pointId, setPointId] = useState('');
  const [holderId, setHolderId] = useState('');
  const [instanceVisible, setInstanceVisible] = useState(false);

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
    setHistory('');
    setAppearance('');
    setEffect('');
    setRules('');
    setMasterNotes('');
    setIsUnique(false);
    setVisible(false);
    setInstructions('');
    setCreateInstance(false);
    setQuantity('1');
    setState('HIDDEN');
    setLocation('currentMap');
    setPointId('');
    setHolderId('');
    setInstanceVisible(false);
    setError(null);
    setAiLoading(false);
    setCreating(false);
    dispatch(fetchCharacters(campaignId));
  }, [isOpen, campaignId, dispatch]);

  useEffect(() => {
    if (!isOpen) aiController.current?.abort();
    return () => aiController.current?.abort();
  }, [isOpen]);

  const nameValid = !isEmpty(name);
  const qtyValid = Number.isInteger(Number(quantity)) && Number(quantity) >= 1;
  const valid = nameValid && (!createInstance || qtyValid);
  const busy = aiLoading || creating;

  /** Only the fields the master actually filled — the AI fills the rest. */
  const collectPartial = (): ImprovisePartialItemInput => {
    const p: ImprovisePartialItemInput = {
      // Booleans are always master-controlled; send them so the AI never flips them.
      isUnique,
      isVisibleToPlayers: visible,
    };
    if (!isEmpty(name)) p.name = T(name);
    if (!isEmpty(type)) p.type = T(type);
    if (!isEmpty(shortDescription)) p.shortDescription = T(shortDescription);
    if (!isEmpty(description)) p.description = T(description);
    if (!isEmpty(history)) p.history = T(history);
    if (!isEmpty(appearance)) p.appearance = T(appearance);
    if (!isEmpty(effectDescription)) p.effectDescription = T(effectDescription);
    if (!isEmpty(rulesText)) p.rulesText = T(rulesText);
    if (!isEmpty(masterNotes)) p.masterNotes = T(masterNotes);
    return p;
  };

  // "Complete with AI": fill the gaps, then merge into EMPTY fields only. A field
  // the master typed is never overwritten (the backend guarantees the same).
  const completeWithAi = async () => {
    if (busy) return;
    aiController.current?.abort();
    const controller = new AbortController();
    aiController.current = controller;
    setAiLoading(true);
    setError(null);
    const input: CompleteImprovisedItemInput = {
      item: collectPartial(),
      instructions: T(instructions) || undefined,
      targetLanguage: i18n.language,
    };
    try {
      const draft = await sessionService.aiCompleteImprovisedItem(
        campaignId,
        input,
        controller.signal,
      );
      setName((v) => (isEmpty(v) ? draft.name : v));
      setType((v) => (isEmpty(v) ? draft.type : v));
      setShort((v) => (isEmpty(v) ? draft.shortDescription : v));
      setDescription((v) => (isEmpty(v) ? draft.description : v));
      setHistory((v) => (isEmpty(v) ? draft.history : v));
      setAppearance((v) => (isEmpty(v) ? draft.appearance : v));
      setEffect((v) => (isEmpty(v) ? draft.effectDescription : v));
      setRules((v) => (isEmpty(v) ? draft.rulesText : v));
      setMasterNotes((v) => (isEmpty(v) ? draft.masterNotes : v));
      // Booleans stay master-controlled — the AI never changes the switches.
      notify(t('session.createItem.aiDone'), { variant: 'success' });
    } catch (err) {
      if ((err as { message?: string })?.message === 'canceled') return;
      setError(t('session.createItem.aiError'));
    } finally {
      if (aiController.current === controller) {
        aiController.current = null;
        setAiLoading(false);
      }
    }
  };

  const buildInstance = (): SessionItemInstanceInput | undefined => {
    if (!createInstance) return undefined;
    const base: SessionItemInstanceInput = {
      create: true,
      quantity: Number(quantity),
      state,
      isVisibleToPlayers: instanceVisible,
    };
    if (location === 'currentMap' && currentMapId) base.mapId = currentMapId;
    else if (location === 'point' && pointId) {
      base.mapPointOfInterestId = pointId;
      if (currentMapId) base.mapId = currentMapId;
    } else if (location === 'character' && holderId) {
      base.holderCharacterId = holderId;
    }
    return base;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return;
    setCreating(true);
    setError(null);
    const input: CreateSessionItemInput = {
      item: {
        name: T(name),
        type: T(type),
        shortDescription: T(shortDescription),
        description: T(description),
        history: T(history),
        appearance: T(appearance),
        effectDescription: T(effectDescription),
        rulesText: T(rulesText),
        masterNotes: T(masterNotes),
        isUnique,
        isVisibleToPlayers: visible,
        generateImage: true,
      },
      instance: buildInstance(),
    };
    try {
      const result = await sessionService.createImprovisedItem(campaignId, input);
      onCreated(result);
    } catch {
      setError(t('session.createItem.createError'));
      setCreating(false);
    }
  };

  const longFields = [
    ['description', description, setDescription, undefined],
    ['appearance', appearance, setAppearance, t('item.hints.appearance')],
    ['history', history, setHistory, undefined],
    ['effectDescription', effectDescription, setEffect, undefined],
    ['rulesText', rulesText, setRules, undefined],
    ['masterNotes', masterNotes, setMasterNotes, t('item.hints.masterOnly')],
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('session.createItem.title')}
      size="lg"
    >
      <Form onSubmit={submit} noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <Chapter>
          <FormField label={t('session.createItem.ideaLabel')} hint={t('session.createItem.ideaHint')}>
            {(p) => (
              <Textarea
                {...p}
                value={instructions}
                placeholder={t('session.createItem.ideaPlaceholder')}
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
              {t('session.createItem.completeWithAi')}
            </Button>
          </Actions>
        </Chapter>

        <Chapter>
          <Grid>
            <FormField
              label={t('item.fields.name')}
              required
              error={!nameValid && name.length > 0 ? t('item.validation.nameRequired') : undefined}
            >
              {(p) => (
                <Input {...p} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              )}
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
              {(p) => (
                <Input {...p} value={shortDescription} maxLength={280} onChange={(e) => setShort(e.target.value)} />
              )}
            </FormField>
          </Grid>
        </Chapter>

        <Chapter>
          <Grid>
            {longFields.map(([key, value, setter, hint]) => (
              <FormField key={key} label={t(`item.fields.${key}`)} hint={hint}>
                {(p) => (
                  <Textarea {...p} value={value} onChange={(e) => setter(e.target.value)} />
                )}
              </FormField>
            ))}
          </Grid>
          <Switch
            label={t('item.fields.isUnique')}
            checked={isUnique}
            onChange={(e) => setIsUnique(e.target.checked)}
          />
          <Switch
            label={t('item.fields.visible')}
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
        </Chapter>

        <Chapter>
          <Switch
            label={t('session.createItem.createInstance')}
            checked={createInstance}
            onChange={(e) => setCreateInstance(e.target.checked)}
          />
          {createInstance && (
            <InstanceBox>
              <Grid>
                <FormField
                  label={t('session.createItem.quantity')}
                  error={!qtyValid ? t('session.createItem.quantityError') : undefined}
                >
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  )}
                </FormField>
                <FormField label={t('session.createItem.state')}>
                  {(p) => (
                    <Select {...p} value={state} onChange={(e) => setState(e.target.value)}>
                      {ITEM_STATES.map((st) => (
                        <option key={st} value={st}>{t(`item.state.${st}`)}</option>
                      ))}
                    </Select>
                  )}
                </FormField>
                <FormField label={t('session.createItem.location')}>
                  {(p) => (
                    <Select
                      {...p}
                      value={location}
                      onChange={(e) => setLocation(e.target.value as LocationKind)}
                    >
                      <option value="currentMap">{t('session.createItem.locationMap')}</option>
                      <option value="point">{t('session.createItem.locationPoint')}</option>
                      <option value="character">{t('session.createItem.locationCharacter')}</option>
                      <option value="unplaced">{t('session.createItem.locationNone')}</option>
                    </Select>
                  )}
                </FormField>
                {location === 'point' && (
                  <FormField label={t('session.createItem.point')}>
                    {(p) => (
                      <Select {...p} value={pointId} onChange={(e) => setPointId(e.target.value)}>
                        <option value="">—</option>
                        {mapPoints.map((pt) => (
                          <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                      </Select>
                    )}
                  </FormField>
                )}
                {location === 'character' && (
                  <FormField label={t('session.createItem.holder')}>
                    {(p) => (
                      <Select {...p} value={holderId} onChange={(e) => setHolderId(e.target.value)}>
                        <option value="">—</option>
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </Select>
                    )}
                  </FormField>
                )}
              </Grid>
              <Switch
                label={t('item.fields.visible')}
                checked={instanceVisible}
                onChange={(e) => setInstanceVisible(e.target.checked)}
              />
            </InstanceBox>
          )}
        </Chapter>

        <Actions>
          <Button type="submit" loading={creating} disabled={!valid || aiLoading}>
            {t('session.createItem.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('session.createItem.cancel')}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}
