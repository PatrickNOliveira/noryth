import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Divider,
  Loading,
  EmptyState,
} from '../components/ui';
import { FactionEntry } from '../components/FactionEntry';
import { ShieldIcon, PlusIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchFactions } from '../store/slices/factions.slice';

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

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

export function FactionsListPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.factions);

  useEffect(() => {
    if (campaignId) dispatch(fetchFactions(campaignId));
  }, [campaignId, dispatch]);

  const open = (id: string) => navigate(`/campaigns/${campaignId}/factions/${id}`);
  const create = () => navigate(`/campaigns/${campaignId}/factions/new`);

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}`)}>
          {t('faction.list.back')}
        </Button>
        <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={create}>
          {t('faction.list.new')}
        </Button>
      </BackRow>

      <ChapterHeading
        eyebrow={t('faction.list.eyebrow')}
        title={t('faction.list.title')}
        lead={t('faction.list.lead')}
      />

      {loading && list.length === 0 ? (
        <Loading block label={t('faction.list.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<ShieldIcon size={36} />}
          title={t('faction.list.emptyTitle')}
          description={t('faction.list.emptyDescription')}
          actions={
            <Button leftIcon={<PlusIcon size={18} />} onClick={create}>
              {t('faction.list.new')}
            </Button>
          }
        />
      ) : (
        <>
          <List>
            {list.map((f) => (
              <FactionEntry key={f.id} faction={f} onOpen={open} />
            ))}
          </List>
          <Divider variant="ornament" />
        </>
      )}
    </Page>
  );
}
