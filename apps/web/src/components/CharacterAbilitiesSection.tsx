import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Badge, BadgeTone, Button, Select, EmptyState } from './ui';
import { DiceIcon } from './icons';
import { AbilityForm, AbilityFormResult } from './AbilityForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchAbilities,
  fetchCharacterAbilities,
  clearCharacterAbilities,
  assignAbility,
  removeCharacterAbility,
  proposeAbility,
  updateProposal,
} from '../store/slices/abilities.slice';
import { AbilityApprovalStatus } from '../types/ability';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
  flex: 1 1 auto;
`;
const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;
const AssignRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
  align-items: center;
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

const statusTone: Record<AbilityApprovalStatus, BadgeTone> = {
  PENDING_APPROVAL: 'warning',
  CHANGES_REQUESTED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
};

interface Props {
  campaignId: string;
  characterId: string;
  mode: 'master' | 'player';
}

export function CharacterAbilitiesSection({ campaignId, characterId, mode }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const links = useAppSelector((s) => s.abilities.characterAbilities);
  const definitions = useAppSelector((s) => s.abilities.list);
  const saving = useAppSelector((s) => s.abilities.saving);
  const myId = useAppSelector((s) => s.auth.user?.id);

  const [assignId, setAssignId] = useState('');
  const [proposing, setProposing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchCharacterAbilities({ campaignId, characterId }));
    dispatch(fetchAbilities(campaignId));
    return () => {
      dispatch(clearCharacterAbilities());
    };
  }, [campaignId, characterId, dispatch]);

  const linkedDefIds = useMemo(
    () => new Set(links.map((l) => l.abilityDefinitionId)),
    [links],
  );
  // Master: approved abilities not yet linked to this character.
  const assignable = definitions.filter(
    (d) => d.approvalStatus === 'APPROVED' && !linkedDefIds.has(d.id),
  );
  // Player: this character's own proposals still under review.
  const myProposals = definitions.filter(
    (d) =>
      d.proposedForCharacterId === characterId &&
      d.proposedByUserId === myId &&
      d.approvalStatus !== 'APPROVED',
  );

  const proposeSubmit = (r: AbilityFormResult) => {
    dispatch(proposeAbility({ campaignId, characterId, input: r }))
      .unwrap()
      .then(() => setProposing(false))
      .catch(() => {});
  };
  const editSubmit = (id: string, r: AbilityFormResult) => {
    dispatch(updateProposal({ campaignId, characterId, id, input: r }))
      .unwrap()
      .then(() => setEditId(null))
      .catch(() => {});
  };

  return (
    <Wrap>
      {links.length === 0 && myProposals.length === 0 && (
        <EmptyState icon={<DiceIcon size={30} />} title={t('ability.character.emptyTitle')} description={t('ability.character.emptyDescription')} />
      )}

      {links.map((l) => (
        <Row key={l.id}>
          <Head>
            <Name>{l.abilityName}</Name>
            {l.abilityType && <Badge $tone="primary">{t(`ability.type.${l.abilityType}`, l.abilityType)}</Badge>}
            {l.isUnique && <Badge $tone="accent">{t('ability.badge.unique')}</Badge>}
            <Badge $tone="success">{t('ability.status.APPROVED')}</Badge>
          </Head>
          {l.customDescription && <Muted>{l.customDescription}</Muted>}
          {mode === 'master' && (
            <Actions>
              <Button size="sm" variant="danger" loading={saving} onClick={() => dispatch(removeCharacterAbility({ campaignId, characterId, linkId: l.id }))}>
                {t('ability.character.remove')}
              </Button>
            </Actions>
          )}
        </Row>
      ))}

      {/* Player: own proposals under review. */}
      {mode === 'player' &&
        myProposals.map((d) =>
          editId === d.id ? (
            <Row key={d.id}>
              <AbilityForm
                variant="proposal"
                initial={d}
                saving={saving}
                submitLabel={t('ability.character.resubmit')}
                onSubmit={(r) => editSubmit(d.id, r)}
                onCancel={() => setEditId(null)}
              />
            </Row>
          ) : (
            <Row key={d.id}>
              <Head>
                <Name>{d.name}</Name>
                <Badge $tone={statusTone[d.approvalStatus]}>{t(`ability.status.${d.approvalStatus}`)}</Badge>
              </Head>
              {d.shortDescription && <Muted>{d.shortDescription}</Muted>}
              {d.reviewNotes && <Muted>📝 {t('ability.character.masterReview')}: {d.reviewNotes}</Muted>}
              {(d.approvalStatus === 'PENDING_APPROVAL' || d.approvalStatus === 'CHANGES_REQUESTED') && (
                <Actions>
                  <Button size="sm" variant="secondary" onClick={() => setEditId(d.id)}>{t('ability.character.editProposal')}</Button>
                </Actions>
              )}
            </Row>
          ),
        )}

      {/* Master: assign an approved ability. */}
      {mode === 'master' && (
        <AssignRow>
          <Select value={assignId} onChange={(e) => setAssignId(e.target.value)} style={{ maxWidth: 320 }}>
            <option value="">{t('ability.character.selectAbility')}</option>
            {assignable.map((d) => (
              <option key={d.id} value={d.id}>{d.name}{d.isUnique ? ' ★' : ''}</option>
            ))}
          </Select>
          <Button
            size="sm"
            loading={saving}
            disabled={!assignId}
            onClick={() => {
              dispatch(assignAbility({ campaignId, characterId, input: { abilityDefinitionId: assignId, isVisibleToPlayers: true } }))
                .unwrap()
                .then(() => setAssignId(''))
                .catch(() => {});
            }}
          >
            {t('ability.character.assign')}
          </Button>
        </AssignRow>
      )}

      {/* Player: propose a new ability. */}
      {mode === 'player' &&
        (proposing ? (
          <Row>
            <AbilityForm
              variant="proposal"
              saving={saving}
              submitLabel={t('ability.character.propose')}
              onSubmit={proposeSubmit}
              onCancel={() => setProposing(false)}
            />
          </Row>
        ) : (
          <div>
            <Button size="sm" variant="secondary" onClick={() => setProposing(true)}>
              {t('ability.character.proposeButton')}
            </Button>
          </div>
        ))}
    </Wrap>
  );
}
