import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, Alert, Badge } from '../ui';
import { CompassIcon } from '../icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { characterService } from '../../services/character.service';
import { abilityService } from '../../services/ability.service';
import { characterFormService } from '../../services/characterForm.service';
import { fetchAttributes } from '../../store/slices/campaignAttributes.slice';
import { fetchFactions } from '../../store/slices/factions.slice';
import { Character } from '../../types/character';
import { CharacterAbility, AbilityDefinition } from '../../types/ability';
import { CharacterForm } from '../../types/characterForm';

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
}

interface SheetData {
  character: Character;
  abilities: CharacterAbility[];
  forms: CharacterForm[];
  abilityDefs: AbilityDefinition[];
}

export function CharacterSheetModal({ campaignId, characterId, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const attributes = useAppSelector((s) => s.campaignAttributes.list);
  const factions = useAppSelector((s) => s.factions.list);

  const cache = useRef(new Map<string, SheetData>());
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
    ])
      .then(([character, abilities, forms, abilityDefs]) => {
        if (cancelled) return;
        const sheet = { character, abilities, forms, abilityDefs };
        cache.current.set(characterId, sheet);
        setData(sheet);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, characterId, campaignId, dispatch]);

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
