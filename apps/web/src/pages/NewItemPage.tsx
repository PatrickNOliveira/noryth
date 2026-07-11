import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button } from '../components/ui';
import { ItemForm, ItemFormResult } from '../components/ItemForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createItem } from '../store/slices/items.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;

export function NewItemPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { saving, error } = useAppSelector((s) => s.items);
  const { isMaster, resolved } = useCampaignMaster(campaignId);

  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${campaignId}/items`, { replace: true });
  }, [resolved, isMaster, campaignId, navigate]);

  const submit = (r: ItemFormResult) => {
    dispatch(createItem({ campaignId, input: r }))
      .unwrap()
      .then((d) => navigate(`/campaigns/${campaignId}/items/${d.id}`, { replace: true }))
      .catch(() => {});
  };

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/items`)}>
          {t('item.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('item.new.eyebrow')} title={t('item.new.title')} lead={t('item.new.lead')} />
      <ItemForm
        mode="create"
        saving={saving}
        error={error}
        submitLabel={t('item.form.create')}
        onSubmit={submit}
        onCancel={() => navigate(`/campaigns/${campaignId}/items`)}
      />
    </Page>
  );
}
