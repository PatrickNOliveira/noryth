import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button, Loading } from '../components/ui';
import { MapForm, MapFormResult } from '../components/MapForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMap,
  updateMap,
  clearSelectedMap,
} from '../store/slices/maps.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;

export function MapEditPage() {
  const { t } = useTranslation();
  const { campaignId = '', mapId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, saving, error, loading } = useAppSelector((s) => s.maps);

  const { isMaster, resolved } = useCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId && mapId) dispatch(fetchMap({ campaignId, mapId }));
    return () => {
      dispatch(clearSelectedMap());
    };
  }, [campaignId, mapId, dispatch]);

  useEffect(() => {
    if (resolved && !isMaster) {
      navigate(`/campaigns/${campaignId}/maps/${mapId}`, { replace: true });
    }
  }, [resolved, isMaster, campaignId, mapId, navigate]);

  const map = selected?.id === mapId ? selected : null;

  const submit = (result: MapFormResult) => {
    const { generateImage, ignoreCampaignArtDirection, includeLabels, ...input } =
      result;
    void generateImage;
    void ignoreCampaignArtDirection;
    void includeLabels;
    dispatch(updateMap({ campaignId, mapId, input }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/maps/${mapId}`, { replace: true }))
      .catch(() => {});
  };

  if (loading && !map) return <Loading block label={t('map.detail.loading')} />;
  if (!map) return null;

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/maps/${mapId}`)}>
          {t('map.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('map.edit.eyebrow')} title={t('map.edit.title')} />
      <MapForm
        campaignId={campaignId}
        mode="edit"
        initial={map}
        saving={saving}
        error={error}
        submitLabel={t('map.form.save')}
        onSubmit={submit}
        onCancel={() => navigate(`/campaigns/${campaignId}/maps/${mapId}`)}
      />
    </Page>
  );
}
