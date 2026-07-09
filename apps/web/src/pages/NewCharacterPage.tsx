import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button } from '../components/ui';
import { CharacterForm, CharacterFormResult } from '../components/CharacterForm';
import { useAppDispatch } from '../store/hooks';
import { createCharacter } from '../store/slices/characters.slice';
import { useAppSelector } from '../store/hooks';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const BackRow = styled.div`
  display: flex;
`;

export function NewCharacterPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { saving, error } = useAppSelector((s) => s.characters);

  const { isMaster, resolved } = useCampaignMaster(campaignId);
  useEffect(() => {
    if (resolved && !isMaster) {
      navigate(`/campaigns/${campaignId}/characters`, { replace: true });
    }
  }, [resolved, isMaster, campaignId, navigate]);

  const submit = (result: CharacterFormResult) => {
    dispatch(createCharacter({ campaignId, input: result }))
      .unwrap()
      .then((c) => navigate(`/campaigns/${campaignId}/characters/${c.id}`, { replace: true }))
      .catch(() => {
        /* error surfaced by the form via slice error */
      });
  };

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/characters`)}>
          {t('character.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('character.new.eyebrow')} title={t('character.new.title')} lead={t('character.new.lead')} />
      <CharacterForm
        campaignId={campaignId}
        mode="create"
        saving={saving}
        error={error}
        submitLabel={t('character.form.create')}
        onSubmit={submit}
        onCancel={() => navigate(`/campaigns/${campaignId}/characters`)}
      />
    </Page>
  );
}
