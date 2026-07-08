import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button } from '../components/ui';
import { CampaignAttributesSection } from '../components/CampaignAttributesSection';

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

      <CampaignAttributesSection campaignId={id} />
    </Page>
  );
}
