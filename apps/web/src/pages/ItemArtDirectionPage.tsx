import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Textarea,
  FormField,
  Alert,
  Loading,
} from '../components/ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchItemArtDirection,
  saveItemArtDirection,
  clearItemArtDirection,
} from '../store/slices/items.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;
const BigText = styled(Textarea)`
  min-height: 200px;
`;

export function ItemArtDirectionPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { artDirection, artDirectionLoaded, saving, error } = useAppSelector(
    (s) => s.items,
  );
  const { isMaster, resolved } = useCampaignMaster(campaignId);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (campaignId) dispatch(fetchItemArtDirection(campaignId));
  }, [campaignId, dispatch]);

  useEffect(() => {
    if (artDirectionLoaded && !touched) setValue(artDirection);
  }, [artDirectionLoaded, artDirection, touched]);

  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${campaignId}/items`, { replace: true });
  }, [resolved, isMaster, campaignId, navigate]);

  const save = () => dispatch(saveItemArtDirection({ campaignId, value }));
  const clear = () => {
    dispatch(clearItemArtDirection(campaignId));
    setValue('');
    setTouched(false);
  };

  if (!artDirectionLoaded) return <Loading block label={t('item.art.loading')} />;

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/items`)}>
          {t('item.art.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('item.art.eyebrow')} title={t('item.art.title')} lead={t('item.art.lead')} />
      {error && <Alert variant="error">{error}</Alert>}
      <Alert variant="info">{t('item.art.help')}</Alert>
      <FormField label={t('item.art.fieldLabel')}>
        {(p) => (
          <BigText
            {...p}
            value={value}
            placeholder={t('item.art.placeholder')}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
        )}
      </FormField>
      <Actions>
        <Button loading={saving} onClick={save}>{t('item.art.save')}</Button>
        <Button variant="danger" onClick={clear} disabled={saving || value.length === 0}>
          {t('item.art.clear')}
        </Button>
      </Actions>
    </Page>
  );
}
