import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ChapterHeading,
  Loading,
} from '../components/ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchParticipants,
  setCampaignMaster,
  clearParticipants,
  presenceOnline,
  presenceOffline,
  presenceSnapshot,
} from '../store/slices/participants.slice';
import {
  realtime,
  CAMPAIGN_PRESENCE_MESSAGES,
  CAMPAIGN_PRESENCE_EVENTS,
} from '../services/realtime';
import { ParticipantRole } from '../types/participant';
import { media } from '../styles/media';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const BackRow = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const Rows = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
`;

const Body = styled.div`
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
`;

const NameRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;

const Email = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  overflow-wrap: anywhere;

  /* Emails are noise on the smallest screens. */
  display: none;
  ${media.tablet} {
    display: inline;
  }
`;

const Presence = styled.span<{ $online: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme, $online }) =>
      $online ? theme.colors.success : theme.colors.textMuted};
    box-shadow: ${({ theme, $online }) =>
      $online ? `0 0 6px ${theme.colors.success}` : 'none'};
  }
`;

const Actions = styled.div`
  margin-left: auto;
  flex: 0 0 auto;
`;

const roleTone: Record<ParticipantRole, 'primary' | 'accent' | 'info' | 'neutral'> = {
  OWNER_MASTER: 'primary',
  OWNER: 'accent',
  MASTER: 'info',
  PLAYER: 'neutral',
};

export function CampaignParticipantsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, onlineUserIds, loading, saving, error } = useAppSelector(
    (s) => s.participants,
  );
  const myId = useAppSelector((s) => s.auth.user?.id);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchParticipants(id));

    // Open presence: join the campaign room and reflect live events into state.
    realtime.emit(CAMPAIGN_PRESENCE_MESSAGES.join, id);
    const onOnline = (payload: unknown) => {
      const p = payload as { campaignId: string; userId: string };
      if (p?.campaignId === id) dispatch(presenceOnline(p.userId));
    };
    const onOffline = (payload: unknown) => {
      const p = payload as { campaignId: string; userId: string };
      if (p?.campaignId === id) dispatch(presenceOffline(p.userId));
    };
    const onSnapshot = (payload: unknown) => {
      const p = payload as { campaignId: string; onlineUserIds: string[] };
      if (p?.campaignId === id) dispatch(presenceSnapshot(p.onlineUserIds));
    };
    realtime.on(CAMPAIGN_PRESENCE_EVENTS.online, onOnline);
    realtime.on(CAMPAIGN_PRESENCE_EVENTS.offline, onOffline);
    realtime.on(CAMPAIGN_PRESENCE_EVENTS.snapshot, onSnapshot);

    return () => {
      realtime.emit(CAMPAIGN_PRESENCE_MESSAGES.leave, id);
      realtime.off(CAMPAIGN_PRESENCE_EVENTS.online, onOnline);
      realtime.off(CAMPAIGN_PRESENCE_EVENTS.offline, onOffline);
      realtime.off(CAMPAIGN_PRESENCE_EVENTS.snapshot, onSnapshot);
      dispatch(clearParticipants());
    };
  }, [id, dispatch]);

  const amOwner = list.find((p) => p.userId === myId)?.isOwner ?? false;
  const online = new Set(onlineUserIds);

  const promote = (userId: string) =>
    dispatch(setCampaignMaster({ campaignId: id, userId }));

  return (
    <Page>
      <BackRow>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/campaigns/${id}`)}
        >
          {t('participant.back')}
        </Button>
      </BackRow>

      <ChapterHeading
        eyebrow={t('participant.eyebrow')}
        title={t('participant.title')}
        lead={t('participant.lead')}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading && list.length === 0 ? (
        <Loading block label={t('participant.loading')} />
      ) : (
        <Rows>
          {list.map((p) => {
            const isOnline = online.has(p.userId);
            return (
              <Row key={p.userId}>
                <Avatar name={p.name} size="md" />
                <Body>
                  <NameRow>
                    <Name>{p.name}</Name>
                    <Badge $tone={roleTone[p.role]}>
                      {t(`participant.role.${p.role}`)}
                    </Badge>
                  </NameRow>
                  <Email>{p.email}</Email>
                  <Presence $online={isOnline}>
                    {t(isOnline ? 'participant.online' : 'participant.offline')}
                  </Presence>
                </Body>
                {amOwner && !p.isMaster && (
                  <Actions>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={saving}
                      onClick={() => promote(p.userId)}
                    >
                      {t('participant.makeMaster')}
                    </Button>
                  </Actions>
                )}
              </Row>
            );
          })}
        </Rows>
      )}
    </Page>
  );
}
