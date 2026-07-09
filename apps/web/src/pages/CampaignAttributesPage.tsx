import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button } from '../components/ui';
import { CampaignAttributesSection } from '../components/CampaignAttributesSection';
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
 * Dedicated management screen for a campaign's character attributes. The full
 * CRUD lives here (reusing {@link CampaignAttributesSection}); the campaign hub
 * only links to it, keeping the main page light.
 */
export function CampaignAttributesPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Attributes are a master-only area — send everyone else back to the hub.
  const { isMaster, resolved } = useCampaignMaster(id);
  useEffect(() => {
    if (resolved && !isMaster) navigate(`/campaigns/${id}`, { replace: true });
  }, [resolved, isMaster, id, navigate]);

  return (
    <Page>
      <BackRow>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/campaigns/${id}`)}
        >
          {t('campaign.attributes.back')}
        </Button>
      </BackRow>

      <CampaignAttributesSection campaignId={id} canManage={isMaster} />
    </Page>
  );
}
