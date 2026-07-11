import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button, Loading } from '../components/ui';
import { AbilityForm, AbilityFormResult } from '../components/AbilityForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAbility, updateAbility, clearSelectedAbility } from '../store/slices/abilities.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;

export function AbilityEditPage() {
  const { t } = useTranslation();
  const { campaignId = '', abilityId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, saving, error, loading } = useAppSelector((s) => s.abilities);
  const { isMaster, resolved } = useCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId && abilityId) dispatch(fetchAbility({ campaignId, id: abilityId }));
    return () => {
      dispatch(clearSelectedAbility());
    };
  }, [campaignId, abilityId, dispatch]);

  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${campaignId}/abilities`, { replace: true });
  }, [resolved, isMaster, campaignId, navigate]);

  const def = selected?.id === abilityId ? selected : null;

  const submit = (r: AbilityFormResult) => {
    dispatch(updateAbility({ campaignId, id: abilityId, input: r }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/abilities`, { replace: true }))
      .catch(() => {});
  };

  if (loading && !def) return <Loading block label={t('ability.loading')} />;
  if (!def) return null;

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/abilities`)}>
          {t('ability.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('ability.edit.eyebrow')} title={t('ability.edit.title')} />
      <AbilityForm variant="master" initial={def} saving={saving} error={error} submitLabel={t('ability.form.save')} onSubmit={submit} onCancel={() => navigate(`/campaigns/${campaignId}/abilities`)} />
    </Page>
  );
}
