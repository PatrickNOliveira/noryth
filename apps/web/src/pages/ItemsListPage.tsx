import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Badge,
  Loading,
  EmptyState,
  Avatar,
} from '../components/ui';
import { PlusIcon, BookIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchItems } from '../store/slices/items.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { ItemImageStatus } from '../types/item';
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

const imageBadge: Partial<Record<ItemImageStatus, 'info' | 'danger'>> = {
  pending: 'info',
  processing: 'info',
  failed: 'danger',
};

export function ItemsListPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.items);
  const isMaster = useIsCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId) dispatch(fetchItems(campaignId));
  }, [campaignId, dispatch]);

  const open = (id: string) => navigate(`/campaigns/${campaignId}/items/${id}`);

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}`)}>
          {t('item.list.back')}
        </Button>
        {isMaster && (
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/items/art-direction`)}>
              {t('item.list.artDirection')}
            </Button>
            <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={() => navigate(`/campaigns/${campaignId}/items/new`)}>
              {t('item.list.new')}
            </Button>
          </Actions>
        )}
      </BackRow>

      <ChapterHeading eyebrow={t('item.list.eyebrow')} title={t('item.list.title')} lead={t('item.list.lead')} />

      {loading && list.length === 0 ? (
        <Loading block label={t('item.list.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<BookIcon size={36} />}
          title={t('item.list.emptyTitle')}
          description={t('item.list.emptyDescription')}
          actions={
            isMaster ? (
              <Button leftIcon={<PlusIcon size={18} />} onClick={() => navigate(`/campaigns/${campaignId}/items/new`)}>
                {t('item.list.new')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Cards>
          {list.map((d) => (
            <Card key={d.id} onClick={() => open(d.id)}>
              <Avatar name={d.name} src={d.imageUrl ?? undefined} size="lg" />
              <Body>
                <Name>{d.name}</Name>
                {d.shortDescription && <Sub>{d.shortDescription}</Sub>}
                <Tags>
                  {d.type && <Badge $tone="primary">{t(`item.type.${d.type}`, d.type)}</Badge>}
                  {d.isUnique && <Badge $tone="accent">{t('item.badge.unique')}</Badge>}
                  {isMaster && (
                    <Badge $tone={d.isVisibleToPlayers ? 'success' : 'neutral'}>
                      {t(d.isVisibleToPlayers ? 'item.visibility.public' : 'item.visibility.private')}
                    </Badge>
                  )}
                  {imageBadge[d.imageStatus] && (
                    <Badge $tone={imageBadge[d.imageStatus]}>{t(`item.imageStatus.${d.imageStatus}`)}</Badge>
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
