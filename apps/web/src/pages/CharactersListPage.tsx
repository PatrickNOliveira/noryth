import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Badge,
  Input,
  Loading,
  EmptyState,
  Avatar,
} from '../components/ui';
import { PlusIcon, CompassIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCharacters } from '../store/slices/characters.slice';
import { fetchFactions } from '../store/slices/factions.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { CharacterImageStatus } from '../types/character';
import { media } from '../styles/media';

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

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const Cards = styled.ul`
  list-style: none;
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
  ${media.tablet} {
    grid-template-columns: 1fr 1fr;
  }
`;

const Card = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast};
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Body = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
`;

const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;

const Sub = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
  margin-top: 2px;
`;

const imageBadge: Partial<Record<CharacterImageStatus, 'info' | 'warning' | 'danger'>> = {
  pending: 'info',
  processing: 'info',
  failed: 'danger',
};

export function CharactersListPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.characters);
  const factions = useAppSelector((s) => s.factions.list);
  const isMaster = useIsCampaignMaster(campaignId);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (campaignId) {
      dispatch(fetchCharacters(campaignId));
      dispatch(fetchFactions(campaignId));
    }
  }, [campaignId, dispatch]);

  const factionName = useMemo(() => {
    const map = new Map(factions.map((f) => [f.id, f.name]));
    return (id: string | null) => (id ? map.get(id) : undefined);
  }, [factions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q),
    );
  }, [list, query]);

  const open = (id: string) => navigate(`/campaigns/${campaignId}/characters/${id}`);

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}`)}>
          {t('character.list.back')}
        </Button>
        {isMaster && (
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/characters/art-direction`)}>
              {t('character.list.artDirection')}
            </Button>
            <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={() => navigate(`/campaigns/${campaignId}/characters/new`)}>
              {t('character.list.new')}
            </Button>
          </Actions>
        )}
      </BackRow>

      <ChapterHeading eyebrow={t('character.list.eyebrow')} title={t('character.list.title')} lead={t('character.list.lead')} />

      {list.length > 0 && (
        <Input
          value={query}
          placeholder={t('character.list.search')}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {loading && list.length === 0 ? (
        <Loading block label={t('character.list.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<CompassIcon size={36} />}
          title={t('character.list.emptyTitle')}
          description={t('character.list.emptyDescription')}
          actions={
            isMaster ? (
              <Button leftIcon={<PlusIcon size={18} />} onClick={() => navigate(`/campaigns/${campaignId}/characters/new`)}>
                {t('character.list.new')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Cards>
          {filtered.map((c) => (
            <Card key={c.id} onClick={() => open(c.id)}>
              <Avatar name={c.name} src={c.imageUrl ?? undefined} size="lg" />
              <Body>
                <Name>{c.name}</Name>
                {c.title && <Sub>{c.title}</Sub>}
                <Tags>
                  {factionName(c.factionId) && (
                    <Badge $tone="primary">{factionName(c.factionId)}</Badge>
                  )}
                  {isMaster && (
                    <Badge $tone={c.isVisibleToPlayers ? 'success' : 'neutral'}>
                      {t(c.isVisibleToPlayers ? 'character.visibility.public' : 'character.visibility.private')}
                    </Badge>
                  )}
                  {imageBadge[c.imageStatus] && (
                    <Badge $tone={imageBadge[c.imageStatus]}>
                      {t(`character.imageStatus.${c.imageStatus}`)}
                    </Badge>
                  )}
                </Tags>
              </Body>
            </Card>
          ))}
        </Cards>
      )}
    </Page>
  );
}
