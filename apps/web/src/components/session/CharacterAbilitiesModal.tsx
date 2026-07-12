import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, Alert, EmptyState, Badge } from '../ui';
import { DiceIcon } from '../icons';
import { abilityService } from '../../services/ability.service';
import { CharacterAbility } from '../../types/ability';
import { AbilitySheetModal } from './AbilitySheetModal';

/**
 * Read-only list of a character's abilities, opened from the session (master
 * only). Reuses the existing character-abilities endpoint; clicking one opens
 * its full definition sheet. A small cache avoids refetch.
 */

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-height: 55vh;
  overflow-y: auto;
`;
const Row = styled.button`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const Title = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
`;
const Desc = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface Props {
  campaignId: string;
  characterId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterAbilitiesModal({ campaignId, characterId, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const cache = useRef(new Map<string, CharacterAbility[]>());
  const [list, setList] = useState<CharacterAbility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !characterId) return;
    const cached = cache.current.get(characterId);
    if (cached) {
      setList(cached);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    setList(null);
    let cancelled = false;
    abilityService
      .listCharacterAbilities(campaignId, characterId)
      .then((abilities) => {
        if (cancelled) return;
        cache.current.set(characterId, abilities);
        setList(abilities);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, characterId, campaignId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.abilities.title')}>
      {loading && <Loading block label={t('session.abilities.loading')} />}
      {error && !loading && (
        <Alert variant="error">{t('session.abilities.error')}</Alert>
      )}
      {list && !loading && (
        list.length === 0 ? (
          <EmptyState
            icon={<DiceIcon size={32} />}
            title={t('session.abilities.emptyTitle')}
            description={t('session.abilities.emptyDescription')}
          />
        ) : (
          <List>
            {list.map((ab) => (
              <Row
                key={ab.id}
                type="button"
                onClick={() => setSelectedDefId(ab.abilityDefinitionId)}
              >
                <Title>
                  <Name>{ab.abilityName}</Name>
                  {ab.abilityType && (
                    <Badge $tone="neutral">
                      {t(`ability.type.${ab.abilityType}`, ab.abilityType)}
                    </Badge>
                  )}
                  {ab.isUnique && (
                    <Badge $tone="accent">{t('session.abilitySheet.unique')}</Badge>
                  )}
                  {ab.status && <Badge $tone="info">{ab.status}</Badge>}
                </Title>
                {ab.customDescription && <Desc>{ab.customDescription}</Desc>}
              </Row>
            ))}
          </List>
        )
      )}

      <AbilitySheetModal
        campaignId={campaignId}
        abilityDefinitionId={selectedDefId}
        isOpen={!!selectedDefId}
        onClose={() => setSelectedDefId(null)}
      />
    </Modal>
  );
}
