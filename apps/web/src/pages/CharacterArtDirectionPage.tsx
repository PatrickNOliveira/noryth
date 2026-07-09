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
  fetchArtDirection,
  saveArtDirection,
  clearArtDirection,
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

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const BigText = styled(Textarea)`
  min-height: 200px;
`;

export function CharacterArtDirectionPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { artDirection, artDirectionLoaded, saving, error } = useAppSelector(
    (s) => s.characters,
  );

  const { isMaster, resolved } = useCampaignMaster(campaignId);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (campaignId) dispatch(fetchArtDirection(campaignId));
  }, [campaignId, dispatch]);

  // Seed the textarea once the stored direction arrives (before the user edits).
  useEffect(() => {
    if (artDirectionLoaded && !touched) setValue(artDirection);
  }, [artDirectionLoaded, artDirection, touched]);

  useEffect(() => {
    if (resolved && !isMaster) {
      navigate(`/campaigns/${campaignId}/characters`, { replace: true });
    }
  }, [resolved, isMaster, campaignId, navigate]);

  const save = () => dispatch(saveArtDirection({ campaignId, value }));
  const clear = () => {
    dispatch(clearArtDirection(campaignId));
    setValue('');
    setTouched(false);
  };

  if (!artDirectionLoaded) {
    return <Loading block label={t('character.art.loading')} />;
  }

  return (
    <Page>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/characters`)}>
          {t('character.art.back')}
        </Button>
      </BackRow>

      <ChapterHeading eyebrow={t('character.art.eyebrow')} title={t('character.art.title')} lead={t('character.art.lead')} />

      {error && <Alert variant="error">{error}</Alert>}
      <Alert variant="info">{t('character.art.help')}</Alert>

      <FormField label={t('character.art.fieldLabel')}>
        {(p) => (
          <BigText
            {...p}
            value={value}
            placeholder={t('character.art.placeholder')}
            onChange={(e) => {
              setValue(e.target.value);
              setTouched(true);
            }}
          />
        )}
      </FormField>

      <Actions>
        <Button loading={saving} onClick={save}>
          {t('character.art.save')}
        </Button>
        <Button variant="danger" onClick={clear} disabled={saving || value.length === 0}>
          {t('character.art.clear')}
        </Button>
      </Actions>
    </Page>
  );
}
