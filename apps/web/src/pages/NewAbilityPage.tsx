import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button } from '../components/ui';
import { AbilityForm, AbilityFormResult } from '../components/AbilityForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createAbility } from '../store/slices/abilities.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;

export function NewAbilityPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { saving, error } = useAppSelector((s) => s.abilities);
  const { isMaster, resolved } = useCampaignMaster(campaignId);

  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${campaignId}/abilities`, { replace: true });
  }, [resolved, isMaster, campaignId, navigate]);

  const submit = (r: AbilityFormResult) => {
    dispatch(createAbility({ campaignId, input: r }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/abilities`, { replace: true }))
      .catch(() => {});
  };

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/abilities`)}>
          {t('ability.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('ability.new.eyebrow')} title={t('ability.new.title')} lead={t('ability.new.lead')} />
      <AbilityForm variant="master" saving={saving} error={error} submitLabel={t('ability.form.create')} onSubmit={submit} onCancel={() => navigate(`/campaigns/${campaignId}/abilities`)} />
    </Page>
  );
}
