import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button } from '../components/ui';
import { CampaignResourcesSection } from '../components/CampaignResourcesSection';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
  justify-content: flex-start;
`;

/**
 * Dedicated management screen for a campaign's character resources. Master-only;
 * everyone else is sent back to the hub. Mirrors the attributes screen.
 */
export function CampaignResourcesPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isMaster, resolved } = useCampaignMaster(id);
  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${id}`, { replace: true });
  }, [resolved, isMaster, id, navigate]);

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${id}`)}>
          {t('campaign.resources.back')}
        </Button>
      </BackRow>
      <CampaignResourcesSection campaignId={id} canManage={isMaster} />
    </Page>
  );
}
