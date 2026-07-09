import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button } from '../components/ui';
import { MapForm, MapFormResult } from '../components/MapForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createMap } from '../store/slices/maps.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;

export function NewMapPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { saving, error } = useAppSelector((s) => s.maps);

  const { isMaster, resolved } = useCampaignMaster(campaignId);
  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${campaignId}/maps`, { replace: true });
  }, [resolved, isMaster, campaignId, navigate]);

  const submit = (result: MapFormResult) => {
    dispatch(createMap({ campaignId, input: result }))
      .unwrap()
      .then((m) => navigate(`/campaigns/${campaignId}/maps/${m.id}`, { replace: true }))
      .catch(() => {});
  };

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/maps`)}>
          {t('map.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('map.new.eyebrow')} title={t('map.new.title')} lead={t('map.new.lead')} />
      <MapForm
        campaignId={campaignId}
        mode="create"
        saving={saving}
        error={error}
        submitLabel={t('map.form.create')}
        onSubmit={submit}
        onCancel={() => navigate(`/campaigns/${campaignId}/maps`)}
      />
    </Page>
  );
}
