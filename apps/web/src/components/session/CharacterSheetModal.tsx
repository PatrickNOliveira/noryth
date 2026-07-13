import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, Alert, Badge, Button, Input, useToast } from '../ui';
import { CompassIcon } from '../icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { characterService } from '../../services/character.service';
import { abilityService } from '../../services/ability.service';
import { characterFormService } from '../../services/characterForm.service';
import { resourceService } from '../../services/resource.service';
import { realtime, SESSION_CHARACTER_EVENTS } from '../../services/realtime';
import { fetchAttributes } from '../../store/slices/campaignAttributes.slice';
import { fetchFactions } from '../../store/slices/factions.slice';
import { Character } from '../../types/character';
import { CharacterAbility, AbilityDefinition } from '../../types/ability';
import { CharacterForm } from '../../types/characterForm';
import { CharacterResource, SessionResourceUpdate } from '../../types/resource';

/**
 * Read-only character sheet, opened from the session (master only). Reuses the
 * existing character-detail endpoint (master-gated, so it may include secrets /
 * master notes) and the abilities endpoint, and enriches attribute/faction ids
 * with names from the store. A tiny per-character cache avoids refetching when
 * reopened. No editing here.
 */

const Head = styled.header`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;
const Portrait = styled.div`
  width: 84px;
  height: 108px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const HeadInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;
const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
`;
const Sub = styled.p`
  font-style: italic;
  color: ${({ theme }) => theme.colors.textMuted};
`;
const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.md};
`;
const SectionTitle = styled.h4`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.primary};
`;
const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
const AttrRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: 2px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
`;
const AttrName = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;
const AttrVal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
`;
const ResourceItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
  padding: ${({ theme }) => theme.spacing.xs} 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
`;
const ResourceTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const ResourceControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
`;
const QtyInput = styled(Input)`
  width: 76px;
  min-height: 38px;
`;
const Saving = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;
const AbilityItem = styled.div`
  padding: ${({ theme }) => theme.spacing.xs} 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const AbilityHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

interface Props {
  campaignId: string;
  characterId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * The placed-character id on the session map. When provided (master, in a live
   * session), the resource rows expose spend/add controls scoped to this token.
   */
  sessionCharacterId?: string | null;
}

interface SheetData {
  character: Character;
  abilities: CharacterAbility[];
  forms: CharacterForm[];
  abilityDefs: AbilityDefinition[];
  /** Effective resources (active-form overrides applied + visibility filtered). */
  resources: CharacterResource[];
}

export function CharacterSheetModal({
  campaignId,
  characterId,
  isOpen,
  onClose,
  sessionCharacterId,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const attributes = useAppSelector((s) => s.campaignAttributes.list);
  const factions = useAppSelector((s) => s.factions.list);
  const myUserId = useAppSelector((s) => s.auth.user?.id);

  const cache = useRef(new Map<string, SheetData>());
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Resource spend/add is available only inside a live session (sessionCharacterId
  // present). Pending is per-resource so one in-flight change doesn't block others.
  const canEditResources = !!sessionCharacterId;
  const [pendingResources, setPendingResources] = useState<Set<string>>(new Set());
  const [adjustOpenId, setAdjustOpenId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  // Per-resource local mutation version — lets stale responses/echoes be ignored.
  const resourceVersions = useRef(new Map<string, number>());

  useEffect(() => {
    if (!isOpen || !characterId) return;
    // Attribute/faction names for enrichment.
    dispatch(fetchAttributes(campaignId));
    dispatch(fetchFactions(campaignId));

    const cached = cache.current.get(characterId);
    if (cached) {
      setData(cached);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    setData(null);
    let cancelled = false;
    Promise.all([
      characterService.getById(campaignId, characterId),
      abilityService.listCharacterAbilities(campaignId, characterId).catch(() => []),
      characterFormService.list(campaignId, characterId).catch(() => []),
      abilityService.list(campaignId).catch(() => []),
      // Effective resources come ready from the backend (form overrides applied,
      // private ones filtered by role) — the modal never resolves overrides itself.
      resourceService.listForCharacter(campaignId, characterId).catch(() => []),
    ])
      .then(([character, abilities, forms, abilityDefs, resources]) => {
        if (cancelled) return;
        const sheet = { character, abilities, forms, abilityDefs, resources };
        cache.current.set(characterId, sheet);
        setData(sheet);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, characterId, campaignId, dispatch]);

  // Reset the inline adjust panel whenever the target character / open state changes.
  useEffect(() => {
    setAdjustOpenId(null);
    setAdjustQty(1);
  }, [characterId, isOpen]);

  // Patch a single resource in local state (and the per-character cache) so a
  // change shows without refetching the whole sheet. Keyed by resourceDefinitionId.
  const applyResource = useCallback(
    (patch: Partial<CharacterResource> & { resourceDefinitionId: string }) => {
      setData((prev) => {
        if (!prev) return prev;
        const resources = prev.resources.map((r) =>
          r.resourceDefinitionId === patch.resourceDefinitionId
            ? { ...r, ...patch }
            : r,
        );
        const next = { ...prev, resources };
        if (characterId) cache.current.set(characterId, next);
        return next;
      });
    },
    [characterId],
  );

  // Spend (delta<0) / add (delta>0) on a resource: optimistic + clamp to the
  // effective bounds, then confirm or roll back only this resource. Persisted
  // current mirrors the effective value (no per-form current in this story).
  const adjustResource = (r: CharacterResource, delta: number) => {
    if (!canEditResources || !sessionCharacterId || !characterId) return;
    const key = r.resourceDefinitionId;
    if (pendingResources.has(key)) return; // block while this resource is in flight
    const target = Math.min(
      Math.max(r.effectiveCurrentValue + delta, r.minValue),
      r.effectiveMaxValue,
    );
    if (target === r.effectiveCurrentValue) return; // already at the bound — no-op
    const snapshot = r;
    setAdjustOpenId(null);
    applyResource({
      resourceDefinitionId: key,
      currentValue: target,
      effectiveCurrentValue: target,
    });
    const version = (resourceVersions.current.get(key) ?? 0) + 1;
    resourceVersions.current.set(key, version);
    setPendingResources((s) => new Set(s).add(key));

    resourceService
      .adjustSessionResource(campaignId, sessionCharacterId, key, delta, String(version))
      .then((res) => {
        if (resourceVersions.current.get(key) !== version) return; // superseded
        applyResource({
          resourceDefinitionId: key,
          currentValue: res.effectiveCurrentValue,
          baseMaxValue: res.baseMaxValue,
          effectiveMaxValue: res.effectiveMaxValue,
          effectiveCurrentValue: res.effectiveCurrentValue,
          isOverriddenByActiveForm: res.isOverriddenByActiveForm,
        });
      })
      .catch(() => {
        if (resourceVersions.current.get(key) !== version) return;
        applyResource(snapshot); // roll back only this resource
        notify(t('session.sheet.resourceError'), { variant: 'error' });
      })
      .finally(() => {
        setPendingResources((s) => {
          const n = new Set(s);
          n.delete(key);
          return n;
        });
      });
  };

  // Live resource updates from other clients (e.g. a second master tab). Own
  // echoes are ignored (already applied optimistically); a stale echo never
  // overrides a newer local mutation for the same resource.
  useEffect(() => {
    if (!isOpen || !sessionCharacterId) return;
    const onResourceUpdated = (payload: unknown) => {
      const p = payload as SessionResourceUpdate;
      if (!p || p.sessionCharacterId !== sessionCharacterId) return;
      if (p.originUserId && p.originUserId === myUserId) return;
      const localVersion = resourceVersions.current.get(p.resourceDefinitionId);
      if (
        localVersion != null &&
        p.clientMutationId != null &&
        Number(p.clientMutationId) < localVersion
      ) {
        return;
      }
      applyResource({
        resourceDefinitionId: p.resourceDefinitionId,
        currentValue: p.effectiveCurrentValue,
        baseMaxValue: p.baseMaxValue,
        effectiveMaxValue: p.effectiveMaxValue,
        effectiveCurrentValue: p.effectiveCurrentValue,
        isOverriddenByActiveForm: p.isOverriddenByActiveForm,
      });
    };
    realtime.on(SESSION_CHARACTER_EVENTS.resourceUpdated, onResourceUpdated);
    return () =>
      realtime.off(SESSION_CHARACTER_EVENTS.resourceUpdated, onResourceUpdated);
  }, [isOpen, sessionCharacterId, myUserId, applyResource]);

  const c = data?.character;
  const faction = c?.factionId ? factions.find((f) => f.id === c.factionId) : undefined;
  const na = t('session.sheet.notInformed');

  // Effective (active form) resolution — form overrides fall back to the base.
  const activeForm =
    data?.forms.find((f) => f.isActive) ?? data?.forms.find((f) => f.isDefault) ?? null;
  const effectiveImage = activeForm?.imageUrl ?? c?.imageUrl ?? null;
  const effectiveAppearance =
    (activeForm?.appearanceDescription?.trim() || c?.appearance) ?? '';
  const effectiveAttributes = (() => {
    if (!c) return [] as { attributeId: string; value: number }[];
    const overrides = new Map(
      (activeForm?.attributes ?? []).map((a) => [a.attributeId, a.value]),
    );
    return c.attributes.map((av) => ({
      attributeId: av.attributeId,
      value: overrides.get(av.attributeId) ?? av.value,
    }));
  })();
  const effectiveAbilities: { key: string; name: string; type: string; extra?: string; status?: string }[] =
    activeForm && !activeForm.usesBaseAbilities
      ? activeForm.abilities.map((fa) => {
          const def = data?.abilityDefs.find((d) => d.id === fa.abilityDefinitionId);
          return {
            key: fa.abilityDefinitionId,
            name: def?.name ?? t('session.sheet.attribute'),
            type: def?.type ?? '',
            extra: def?.effectDescription || def?.shortDescription,
          };
        })
      : (data?.abilities ?? []).map((ab) => ({
          key: ab.id,
          name: ab.abilityName,
          type: ab.abilityType,
          extra: ab.customDescription ?? undefined,
          status: ab.status,
        }));

  const prose = (label: string, value?: string | null) =>
    value && value.trim() ? (
      <Section>
        <SectionTitle>{label}</SectionTitle>
        <Prose>{value}</Prose>
      </Section>
    ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={t('session.sheet.title')}
    >
      {loading && <Loading block label={t('session.sheet.loading')} />}
      {error && !loading && (
        <Alert variant="error">{t('session.sheet.error')}</Alert>
      )}
      {c && !loading && (
        <>
          <Head>
            <Portrait>
              {effectiveImage ? <img src={effectiveImage} alt={c.name} /> : <CompassIcon size={28} />}
            </Portrait>
            <HeadInfo>
              <Name>{c.name}</Name>
              {c.title && <Sub>{c.title}</Sub>}
              <Badges>
                {activeForm && (
                  <Badge $tone="accent">
                    {t('session.form.activeLabel')}: {activeForm.name}
                  </Badge>
                )}
                <Badge $tone={c.isPlayerCharacter ? 'accent' : 'neutral'}>
                  {c.isPlayerCharacter
                    ? t('session.sheet.playerCharacter')
                    : t('session.sheet.npc')}
                </Badge>
                <Badge $tone={c.isVisibleToPlayers ? 'success' : 'neutral'}>
                  {c.isVisibleToPlayers
                    ? t('session.sheet.visible')
                    : t('session.sheet.hidden')}
                </Badge>
                {faction && <Badge $tone="primary">{faction.name}</Badge>}
              </Badges>
            </HeadInfo>
          </Head>

          {c.shortDescription && <Prose>{c.shortDescription}</Prose>}

          <Section>
            <SectionTitle>{t('session.sheet.resources')}</SectionTitle>
            {(data?.resources ?? []).length === 0 ? (
              <AttrName>{t('session.sheet.noResources')}</AttrName>
            ) : (
              (data?.resources ?? []).map((r) => {
                const isPending = pendingResources.has(r.resourceDefinitionId);
                const atMin = r.effectiveCurrentValue <= r.minValue;
                const atMax = r.effectiveCurrentValue >= r.effectiveMaxValue;
                return (
                  <ResourceItem key={r.resourceDefinitionId}>
                    <ResourceTop>
                      <AttrName>
                        {r.name}
                        {r.isOverriddenByActiveForm && ` · ${t('session.sheet.fromForm')}`}
                        {!r.isVisibleToPlayers && ` · ${t('session.sheet.hidden')}`}
                      </AttrName>
                      <AttrVal>
                        {r.effectiveCurrentValue} / {r.effectiveMaxValue}
                      </AttrVal>
                    </ResourceTop>
                    {canEditResources && (
                      <ResourceControls>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isPending || atMin}
                          onClick={() => adjustResource(r, -1)}
                        >
                          -1
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isPending || atMax}
                          onClick={() => adjustResource(r, 1)}
                        >
                          +1
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            setAdjustOpenId((id) =>
                              id === r.resourceDefinitionId
                                ? null
                                : r.resourceDefinitionId,
                            )
                          }
                        >
                          {t('session.sheet.adjust')}
                        </Button>
                        {isPending && <Saving>{t('session.sheet.saving')}</Saving>}
                      </ResourceControls>
                    )}
                    {canEditResources && adjustOpenId === r.resourceDefinitionId && (
                      <ResourceControls>
                        <QtyInput
                          type="number"
                          min={1}
                          step={1}
                          value={adjustQty}
                          aria-label={t('session.sheet.quantity')}
                          onChange={(e) =>
                            setAdjustQty(
                              Math.max(1, Math.floor(Number(e.target.value) || 1)),
                            )
                          }
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isPending}
                          onClick={() => adjustResource(r, -adjustQty)}
                        >
                          {t('session.sheet.spend')}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isPending}
                          onClick={() => adjustResource(r, adjustQty)}
                        >
                          {t('session.sheet.add')}
                        </Button>
                      </ResourceControls>
                    )}
                  </ResourceItem>
                );
              })
            )}
          </Section>

          {prose(t('session.sheet.appearance'), effectiveAppearance)}
          {prose(t('session.sheet.personality'), c.personality)}
          {prose(t('session.sheet.motivations'), c.motivations)}
          {prose(t('session.sheet.description'), c.description)}
          {prose(t('session.sheet.history'), c.history)}

          <Section>
            <SectionTitle>{t('session.sheet.attributes')}</SectionTitle>
            {effectiveAttributes.length === 0 ? (
              <Prose>{na}</Prose>
            ) : (
              effectiveAttributes.map((av) => {
                const def = attributes.find((a) => a.id === av.attributeId);
                return (
                  <AttrRow key={av.attributeId}>
                    <AttrName>{def?.name ?? t('session.sheet.attribute')}</AttrName>
                    <AttrVal>
                      {def ? `${av.value} / ${def.maxValue}` : av.value}
                    </AttrVal>
                  </AttrRow>
                );
              })
            )}
          </Section>

          {effectiveAbilities.length > 0 && (
            <Section>
              <SectionTitle>{t('session.sheet.abilities')}</SectionTitle>
              {effectiveAbilities.map((ab) => (
                <AbilityItem key={ab.key}>
                  <AbilityHead>
                    <AttrVal>{ab.name}</AttrVal>
                    {ab.type && (
                      <Badge $tone="neutral">
                        {t(`ability.type.${ab.type}`, ab.type)}
                      </Badge>
                    )}
                    {ab.status && <Badge $tone="info">{ab.status}</Badge>}
                  </AbilityHead>
                  {ab.extra && <Prose>{ab.extra}</Prose>}
                </AbilityItem>
              ))}
            </Section>
          )}

          {/* Master-only private fields. */}
          {prose(t('session.sheet.secrets'), c.secrets)}
          {prose(t('session.sheet.masterNotes'), c.masterNotes)}
        </>
      )}
    </Modal>
  );
}
