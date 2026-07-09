import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ChapterHeading, Button, Loading } from '../components/ui';
import { CharacterForm, CharacterFormResult } from '../components/CharacterForm';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchCharacter,
  updateCharacter,
  clearSelectedCharacter,
} from '../store/slices/characters.slice';
import { useCampaignMaster } from '../hooks/useIsCampaignMaster';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const BackRow = styled.div`
  display: flex;
`;

export function CharacterEditPage() {
  const { t } = useTranslation();
  const { campaignId = '', characterId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, saving, error, loading } = useAppSelector((s) => s.characters);

  const { isMaster, resolved } = useCampaignMaster(campaignId);

  useEffect(() => {
    if (campaignId && characterId) dispatch(fetchCharacter({ campaignId, characterId }));
    return () => {
      dispatch(clearSelectedCharacter());
    };
  }, [campaignId, characterId, dispatch]);

  useEffect(() => {
    if (resolved && !isMaster) {
      navigate(`/campaigns/${campaignId}/characters/${characterId}`, { replace: true });
    }
  }, [resolved, isMaster, campaignId, characterId, navigate]);

  const character = selected?.id === characterId ? selected : null;

  const submit = (result: CharacterFormResult) => {
    const { generateImage, ignoreCampaignArtDirection, ...input } = result;
    void generateImage;
    void ignoreCampaignArtDirection;
    dispatch(updateCharacter({ campaignId, characterId, input }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/characters/${characterId}`, { replace: true }))
      .catch(() => {
        /* error surfaced by the form via slice error */
      });
  };

  if (loading && !character) return <Loading block label={t('character.detail.loading')} />;
  if (!character) return null;

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/characters/${characterId}`)}>
          {t('character.form.back')}
        </Button>
      </BackRow>
      <ChapterHeading eyebrow={t('character.edit.eyebrow')} title={t('character.edit.title')} />
      <CharacterForm
        campaignId={campaignId}
        mode="edit"
        initial={character}
        saving={saving}
        error={error}
        submitLabel={t('character.form.save')}
        onSubmit={submit}
        onCancel={() => navigate(`/campaigns/${campaignId}/characters/${characterId}`)}
      />
    </Page>
  );
}
