import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Badge,
  Button,
  Divider,
  Loading,
  Alert,
  Textarea,
  Switch,
} from '../components/ui';
import { CompassIcon } from '../components/icons';
import { PlayerCharacterForm, PlayerCharacterFormResult } from '../components/PlayerCharacterForm';
import { AttributeDistribution } from '../components/AttributeDistribution';
import { CharacterAbilitiesSection } from '../components/CharacterAbilitiesSection';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMyCharacter,
  createMyCharacter,
  updateMyCharacter,
  regenerateMyImage,
  characterImageUpdate,
} from '../store/slices/characters.slice';
import { fetchFactions } from '../store/slices/factions.slice';
import { realtime, CHARACTER_IMAGE_EVENTS } from '../services/realtime';
import { useImageFallbackPoll } from '../hooks/useImageFallbackPoll';
import { CharacterImageStatus } from '../types/character';
import { media } from '../styles/media';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;
const BackRow = styled.div`
  display: flex;
`;
const Head = styled.header`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  ${media.tablet} {
    grid-template-columns: 200px 1fr;
  }
`;
const Portrait = styled.div`
  aspect-ratio: 3 / 4;
  max-width: 240px;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, ${({ theme }) => theme.colors.surfaceAlt});
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.primary};
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const Titles = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Name = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  color: ${({ theme }) => theme.colors.text};
`;
const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const AdjustBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;
const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const eventStatus: Record<string, CharacterImageStatus> = {
  [CHARACTER_IMAGE_EVENTS.processing]: 'processing',
  [CHARACTER_IMAGE_EVENTS.completed]: 'completed',
  [CHARACTER_IMAGE_EVENTS.failed]: 'failed',
};

export function MyCharacterPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mine, mineLoaded, saving, error } = useAppSelector((s) => s.characters);
  const factions = useAppSelector((s) => s.factions.list);
  const [editing, setEditing] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [ignoreArt, setIgnoreArt] = useState(false);

  useEffect(() => {
    if (campaignId) {
      dispatch(fetchMyCharacter(campaignId));
      dispatch(fetchFactions(campaignId));
    }
  }, [campaignId, dispatch]);

  const mineId = mine?.id;
  useEffect(() => {
    if (!campaignId || !mineId) return;
    const rooms = [`character:${mineId}`, `campaign:${campaignId}`];
    const handler = (event: string) => (payload: unknown) => {
      const p = payload as { characterId?: string; imageUrl?: string; errorMessage?: string };
      if (p?.characterId !== mineId) return;
      dispatch(
        characterImageUpdate({
          characterId: mineId,
          imageStatus: eventStatus[event],
          imageUrl: p.imageUrl,
          imageError: p.errorMessage ?? null,
        }),
      );
    };
    const handlers = Object.values(CHARACTER_IMAGE_EVENTS).map((e) => {
      const h = handler(e);
      realtime.on(e, h);
      return [e, h] as const;
    });
    rooms.forEach((r) => realtime.join(r));
    return () => {
      handlers.forEach(([e, h]) => realtime.off(e, h));
      rooms.forEach((r) => realtime.leave(r));
    };
  }, [campaignId, mineId, dispatch]);

  const mineInFlight =
    mine?.imageStatus === 'pending' || mine?.imageStatus === 'processing';
  useImageFallbackPoll(!!mineInFlight, () => {
    if (campaignId) dispatch(fetchMyCharacter(campaignId));
  });

  const create = (r: PlayerCharacterFormResult) =>
    dispatch(createMyCharacter({ campaignId, input: r }));
  const saveEdit = (r: PlayerCharacterFormResult) => {
    const { generateImage, ignoreCampaignArtDirection, ...input } = r;
    void generateImage;
    void ignoreCampaignArtDirection;
    dispatch(updateMyCharacter({ campaignId, characterId: mineId as string, input }))
      .unwrap()
      .then(() => setEditing(false))
      .catch(() => {});
  };
  const submitAdjust = () => {
    dispatch(
      regenerateMyImage({
        campaignId,
        characterId: mineId as string,
        adjustments: adjustText.trim() || undefined,
        ignoreCampaignArtDirection: ignoreArt,
      }),
    );
    setAdjustOpen(false);
    setAdjustText('');
    setIgnoreArt(false);
  };

  if (!mineLoaded) return <Loading block label={t('playerCharacter.loading')} />;

  const back = (
    <BackRow>
      <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}`)}>
        {t('playerCharacter.back')}
      </Button>
    </BackRow>
  );

  if (!mine) {
    return (
      <Page>
        {back}
        <ChapterHeading eyebrow={t('playerCharacter.new.eyebrow')} title={t('playerCharacter.new.title')} lead={t('playerCharacter.new.lead')} />
        <PlayerCharacterForm
          campaignId={campaignId}
          mode="create"
          saving={saving}
          error={error}
          submitLabel={t('playerCharacter.form.create')}
          onSubmit={create}
        />
      </Page>
    );
  }

  const c = mine;
  const factionName = c.factionId ? factions.find((f) => f.id === c.factionId)?.name : undefined;
  const generating = c.imageStatus === 'pending' || c.imageStatus === 'processing';

  return (
    <Page>
      {back}

      <Head>
        <Portrait>{c.imageUrl ? <img src={c.imageUrl} alt={c.name} /> : <CompassIcon size={44} />}</Portrait>
        <Titles>
          <Badges>
            <Badge $tone="accent">{t('playerCharacter.badge')}</Badge>
            {factionName && <Badge $tone="primary">{factionName}</Badge>}
            {c.imageStatus !== 'none' && c.imageStatus !== 'completed' && (
              <Badge $tone={c.imageStatus === 'failed' ? 'danger' : 'info'}>{t(`character.imageStatus.${c.imageStatus}`)}</Badge>
            )}
          </Badges>
          <Name>{c.name}</Name>
          {c.title && <Prose>{c.title}</Prose>}
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {t('playerCharacter.edit')}
            </Button>
            {c.imageStatus === 'completed' ? (
              <Button size="sm" variant="secondary" onClick={() => setAdjustOpen((o) => !o)}>
                {t('character.detail.requestChange')}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>
                {t('character.detail.generate')}
              </Button>
            )}
          </Actions>
          {adjustOpen && (
            <AdjustBox>
              <Textarea value={adjustText} placeholder={t('character.detail.adjustPlaceholder')} onChange={(e) => setAdjustText(e.target.value)} />
              <Switch label={t('character.fields.ignoreArtDirection')} checked={ignoreArt} onChange={(e) => setIgnoreArt(e.target.checked)} />
              <Actions>
                <Button size="sm" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>{t('character.detail.generateVersion')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>{t('character.form.cancel')}</Button>
              </Actions>
            </AdjustBox>
          )}
          {c.imageStatus === 'failed' && c.imageError && <Alert variant="error">{c.imageError}</Alert>}
        </Titles>
      </Head>

      {editing ? (
        <Chapter>
          <ChapterHeading title={t('playerCharacter.edit')} />
          <PlayerCharacterForm
            campaignId={campaignId}
            mode="edit"
            initial={c}
            saving={saving}
            error={error}
            submitLabel={t('character.form.save')}
            onSubmit={saveEdit}
            onCancel={() => setEditing(false)}
          />
        </Chapter>
      ) : (
        [
          { key: 'shortDescription', value: c.shortDescription },
          { key: 'appearance', value: c.appearance },
          { key: 'description', value: c.description },
          { key: 'personality', value: c.personality },
          { key: 'motivations', value: c.motivations },
          { key: 'history', value: c.history },
          { key: 'secrets', value: c.secrets },
        ]
          .filter((x) => x.value)
          .map((entry) => (
            <Chapter key={entry.key}>
              <ChapterHeading title={t(`character.fields.${entry.key}`)} />
              <Prose>{entry.value}</Prose>
            </Chapter>
          ))
      )}

      <Divider variant="ornament" />

      <Chapter>
        <ChapterHeading eyebrow={t('playerCharacter.attributes.eyebrow')} title={t('playerCharacter.attributes.title')} lead={t('playerCharacter.attributes.lead')} />
        <AttributeDistribution campaignId={campaignId} character={c} />
      </Chapter>

      <Chapter>
        <ChapterHeading eyebrow={t('ability.character.eyebrow')} title={t('ability.character.title')} lead={t('ability.character.playerLead')} />
        <CharacterAbilitiesSection campaignId={campaignId} characterId={c.id} mode="player" />
      </Chapter>
    </Page>
  );
}
