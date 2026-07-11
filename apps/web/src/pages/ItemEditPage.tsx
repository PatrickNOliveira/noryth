import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button, Loading } from '../components/ui';
import { ItemForm, ItemFormResult } from '../components/ItemForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchItem, updateItem, clearSelectedItem } from '../store/slices/items.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;

export function ItemEditPage() {
  const { t } = useTranslation();
  const { campaignId = '', itemId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, saving, error, loading } = useAppSelector((s) => s.items);
  const { isMaster, resolved } = useCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId && itemId) dispatch(fetchItem({ campaignId, id: itemId }));
    return () => {
      dispatch(clearSelectedItem());
    };
  }, [campaignId, itemId, dispatch]);

  useEffect(() => {
    if (resolved && !isMaster) {
      navigate(`/campaigns/${campaignId}/items/${itemId}`, { replace: true });
    }
  }, [resolved, isMaster, campaignId, itemId, navigate]);

  const def = selected?.id === itemId ? selected : null;

  const submit = (r: ItemFormResult) => {
    const { generateImage, ignoreCampaignArtDirection, ...input } = r;
    void generateImage;
    void ignoreCampaignArtDirection;
    dispatch(updateItem({ campaignId, id: itemId, input }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/items/${itemId}`, { replace: true }))
      .catch(() => {});
  };

  if (loading && !def) return <Loading block label={t('item.detail.loading')} />;
  if (!def) return null;

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/items/${itemId}`)}>
          {t('item.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('item.edit.eyebrow')} title={t('item.edit.title')} />
      <ItemForm
        mode="edit"
        initial={def}
        saving={saving}
        error={error}
        submitLabel={t('item.form.save')}
        onSubmit={submit}
        onCancel={() => navigate(`/campaigns/${campaignId}/items/${itemId}`)}
      />
    </Page>
  );
}
