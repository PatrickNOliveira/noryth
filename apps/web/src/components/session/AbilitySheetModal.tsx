import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, Alert, Badge } from '../ui';
import { abilityService } from '../../services/ability.service';
import { AbilityDefinition } from '../../types/ability';

/**
 * Read-only ability sheet: all the info of an ability DEFINITION. Opened from a
 * character's abilities list; fetches the definition by id (master-gated on the
 * backend) with a small cache. No editing.
 */

const Head = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;
const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
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

interface Props {
  campaignId: string;
  abilityDefinitionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AbilitySheetModal({ campaignId, abilityDefinitionId, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const cache = useRef(new Map<string, AbilityDefinition>());
  const [ability, setAbility] = useState<AbilityDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen || !abilityDefinitionId) return;
    const cached = cache.current.get(abilityDefinitionId);
    if (cached) {
      setAbility(cached);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    setAbility(null);
    let cancelled = false;
    abilityService
      .getById(campaignId, abilityDefinitionId)
      .then((a) => {
        if (cancelled) return;
        cache.current.set(abilityDefinitionId, a);
        setAbility(a);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, abilityDefinitionId, campaignId]);

  const prose = (label: string, value?: string | null) =>
    value && value.trim() ? (
      <Section>
        <SectionTitle>{label}</SectionTitle>
        <Prose>{value}</Prose>
      </Section>
    ) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={t('session.abilitySheet.title')}>
      {loading && <Loading block label={t('session.abilitySheet.loading')} />}
      {error && !loading && (
        <Alert variant="error">{t('session.abilitySheet.error')}</Alert>
      )}
      {ability && !loading && (
        <>
          <Head>
            <Name>{ability.name}</Name>
            <Badges>
              {ability.type && (
                <Badge $tone="primary">{t(`ability.type.${ability.type}`, ability.type)}</Badge>
              )}
              {ability.isUnique && (
                <Badge $tone="accent">{t('session.abilitySheet.unique')}</Badge>
              )}
              <Badge $tone={ability.isVisibleToPlayers ? 'success' : 'neutral'}>
                {ability.isVisibleToPlayers
                  ? t('session.abilitySheet.visible')
                  : t('session.abilitySheet.hidden')}
              </Badge>
            </Badges>
          </Head>

          {ability.shortDescription && <Prose>{ability.shortDescription}</Prose>}

          {prose(t('session.abilitySheet.description'), ability.description)}
          {prose(t('session.abilitySheet.effect'), ability.effectDescription)}
          {prose(t('session.abilitySheet.cost'), ability.costDescription)}
          {prose(t('session.abilitySheet.limitations'), ability.limitationDescription)}
          {prose(t('session.abilitySheet.rules'), ability.rulesText)}
          {prose(t('session.abilitySheet.history'), ability.history)}
          {prose(t('session.abilitySheet.masterNotes'), ability.masterNotes)}
        </>
      )}
    </Modal>
  );
}
