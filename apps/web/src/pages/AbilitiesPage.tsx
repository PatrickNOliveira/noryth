import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Badge,
  BadgeTone,
  Loading,
  EmptyState,
  Textarea,
  Divider,
} from '../components/ui';
import { PlusIcon, DiceIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchAbilities,
  fetchPendingAbilities,
  approveAbility,
  rejectAbility,
  requestAbilityChanges,
  removeAbility,
} from '../store/slices/abilities.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { AbilityApprovalStatus } from '../types/ability';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;
const List = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
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
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
`;

export const statusTone: Record<AbilityApprovalStatus, BadgeTone> = {
  PENDING_APPROVAL: 'warning',
  CHANGES_REQUESTED: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function ReviewBox({ campaignId, id }: { campaignId: string; id: string }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const saving = useAppSelector((s) => s.abilities.saving);
  const [notes, setNotes] = useState('');
  return (
    <>
      <Textarea value={notes} placeholder={t('ability.review.notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
      <Actions>
        <Button size="sm" loading={saving} onClick={() => dispatch(approveAbility({ campaignId, id, reviewNotes: notes.trim() || undefined }))}>
          {t('ability.review.approve')}
        </Button>
        <Button size="sm" variant="secondary" loading={saving} onClick={() => dispatch(requestAbilityChanges({ campaignId, id, reviewNotes: notes.trim() || undefined }))}>
          {t('ability.review.requestChanges')}
        </Button>
        <Button size="sm" variant="danger" loading={saving} onClick={() => dispatch(rejectAbility({ campaignId, id, reviewNotes: notes.trim() || undefined }))}>
          {t('ability.review.reject')}
        </Button>
      </Actions>
    </>
  );
}

export function AbilitiesPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, pending, loading } = useAppSelector((s) => s.abilities);
  const isMaster = useIsCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId) dispatch(fetchAbilities(campaignId));
  }, [campaignId, dispatch]);

  useEffect(() => {
    if (campaignId && isMaster) dispatch(fetchPendingAbilities(campaignId));
  }, [campaignId, isMaster, dispatch]);

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}`)}>
          {t('ability.back')}
        </Button>
        {isMaster && (
          <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={() => navigate(`/campaigns/${campaignId}/abilities/new`)}>
            {t('ability.new.button')}
          </Button>
        )}
      </BackRow>

      <ChapterHeading eyebrow={t('ability.eyebrow')} title={t('ability.title')} lead={t('ability.lead')} />

      {isMaster && pending.length > 0 && (
        <div>
          <ChapterHeading eyebrow={t('ability.pending.eyebrow')} title={t('ability.pending.title')} />
          <List>
            {pending.map((d) => (
              <Row key={d.id}>
                <Head>
                  <Name>{d.name}</Name>
                  {d.isUnique && <Badge $tone="accent">{t('ability.badge.unique')}</Badge>}
                  <Badge $tone={statusTone[d.approvalStatus]}>{t(`ability.status.${d.approvalStatus}`)}</Badge>
                </Head>
                {d.shortDescription && <Muted>{d.shortDescription}</Muted>}
                {d.rulesText && <Muted>{d.rulesText}</Muted>}
                <ReviewBox campaignId={campaignId} id={d.id} />
              </Row>
            ))}
          </List>
          <Divider variant="ornament" />
        </div>
      )}

      {loading && list.length === 0 ? (
        <Loading block label={t('ability.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<DiceIcon size={36} />}
          title={t('ability.emptyTitle')}
          description={isMaster ? t('ability.emptyMaster') : t('ability.emptyPlayer')}
          actions={
            isMaster ? (
              <Button leftIcon={<PlusIcon size={18} />} onClick={() => navigate(`/campaigns/${campaignId}/abilities/new`)}>
                {t('ability.new.button')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <List>
          {list.map((d) => (
            <Row key={d.id}>
              <Head>
                <Name>{d.name}</Name>
                {d.type && <Badge $tone="primary">{t(`ability.type.${d.type}`, d.type)}</Badge>}
                {d.isUnique && <Badge $tone="accent">{t('ability.badge.unique')}</Badge>}
                <Badge $tone={statusTone[d.approvalStatus]}>{t(`ability.status.${d.approvalStatus}`)}</Badge>
                {isMaster && (
                  <Badge $tone={d.isVisibleToPlayers ? 'success' : 'neutral'}>
                    {t(d.isVisibleToPlayers ? 'ability.visibility.public' : 'ability.visibility.private')}
                  </Badge>
                )}
              </Head>
              {d.shortDescription && <Muted>{d.shortDescription}</Muted>}
              {d.reviewNotes && <Muted>📝 {d.reviewNotes}</Muted>}
              {isMaster && (
                <Actions>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/abilities/${d.id}/edit`)}>
                    {t('ability.edit.button')}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => dispatch(removeAbility({ campaignId, id: d.id }))}>
                    {t('ability.remove')}
                  </Button>
                </Actions>
              )}
            </Row>
          ))}
        </List>
      )}
    </Page>
  );
}
