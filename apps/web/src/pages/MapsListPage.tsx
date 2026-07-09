import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Badge,
  Loading,
  EmptyState,
} from '../components/ui';
import { PlusIcon, MapIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMaps } from '../store/slices/maps.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { CampaignMap, MapImageStatus } from '../types/map';

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
const Tree = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Row = styled.li<{ $depth: number }>`
  margin-left: ${({ $depth, theme }) => `calc(${$depth} * ${theme.spacing.lg})`};
`;
const Node = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const imageBadge: Partial<Record<MapImageStatus, 'info' | 'danger'>> = {
  pending: 'info',
  processing: 'info',
  failed: 'danger',
};

export function MapsListPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.maps);
  const isMaster = useIsCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId) dispatch(fetchMaps(campaignId));
  }, [campaignId, dispatch]);

  // Build a tree (roots + children) from the flat list.
  const childrenOf = useMemo(() => {
    const byParent = new Map<string | null, CampaignMap[]>();
    for (const m of list) {
      const key = m.parentMapId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(m);
    }
    return byParent;
  }, [list]);

  const open = (id: string) => navigate(`/campaigns/${campaignId}/maps/${id}`);

  const renderNodes = (parentId: string | null, depth: number): JSX.Element[] => {
    const nodes = childrenOf.get(parentId) ?? [];
    return nodes.flatMap((m) => [
      <Row key={m.id} $depth={depth}>
        <Node onClick={() => open(m.id)}>
          <MapIcon size={18} />
          <Name>{m.name}</Name>
          {m.type && <Badge $tone="primary">{t(`map.type.${m.type}`, m.type)}</Badge>}
          {isMaster && (
            <Badge $tone={m.isVisibleToPlayers ? 'success' : 'neutral'}>
              {t(m.isVisibleToPlayers ? 'map.visibility.public' : 'map.visibility.private')}
            </Badge>
          )}
          {imageBadge[m.imageStatus] && (
            <Badge $tone={imageBadge[m.imageStatus]}>{t(`map.imageStatus.${m.imageStatus}`)}</Badge>
          )}
        </Node>
      </Row>,
      ...renderNodes(m.id, depth + 1),
    ]);
  };

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}`)}>
          {t('map.list.back')}
        </Button>
        {isMaster && (
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/maps/art-direction`)}>
              {t('map.list.artDirection')}
            </Button>
            <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={() => navigate(`/campaigns/${campaignId}/maps/new`)}>
              {t('map.list.new')}
            </Button>
          </Actions>
        )}
      </BackRow>

      <ChapterHeading eyebrow={t('map.list.eyebrow')} title={t('map.list.title')} lead={t('map.list.lead')} />

      {loading && list.length === 0 ? (
        <Loading block label={t('map.list.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<MapIcon size={36} />}
          title={t('map.list.emptyTitle')}
          description={t('map.list.emptyDescription')}
          actions={
            isMaster ? (
              <Button leftIcon={<PlusIcon size={18} />} onClick={() => navigate(`/campaigns/${campaignId}/maps/new`)}>
                {t('map.list.new')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Tree>{renderNodes(null, 0)}</Tree>
      )}
    </Page>
  );
}
