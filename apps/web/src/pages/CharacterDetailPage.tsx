import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Card,
  Badge,
  Button,
  Divider,
  Loading,
  Alert,
  Textarea,
  Switch,
  Input,
} from '../components/ui';
import { CompassIcon } from '../components/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchCharacter,
  clearSelectedCharacter,
  removeCharacter,
  updateCharacter,
  generateCharacterImage,
  regenerateCharacterImage,
  setCharacterBudget,
  characterImageUpdate,
} from '../store/slices/characters.slice';
import { fetchFactions } from '../store/slices/factions.slice';
import { fetchAttributes } from '../store/slices/campaignAttributes.slice';
import { useIsCampaignMaster } from '../hooks/useIsCampaignMaster';
import { useImageFallbackPoll } from '../hooks/useImageFallbackPoll';
import { CharacterAbilitiesSection } from '../components/CharacterAbilitiesSection';
import { realtime, CHARACTER_IMAGE_EVENTS } from '../services/realtime';
import { CharacterImageStatus } from '../types/character';
import { media } from '../styles/media';

const BackRow = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Head = styled.header`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  ${media.tablet} {
    grid-template-columns: 220px 1fr;
  }
`;

const Portrait = styled.div`
  position: relative;
  aspect-ratio: 3 / 4;
  max-width: 260px;
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
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
`;

const Title = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  color: ${({ theme }) => theme.colors.accent};
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

const AdjustBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Examples = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-style: italic;
`;

const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const AttrList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Attr = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
`;

const AttrName = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const AttrValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
`;

const eventStatus: Record<string, CharacterImageStatus> = {
  [CHARACTER_IMAGE_EVENTS.processing]: 'processing',
  [CHARACTER_IMAGE_EVENTS.completed]: 'completed',
  [CHARACTER_IMAGE_EVENTS.failed]: 'failed',
};

export function CharacterDetailPage() {
  const { t } = useTranslation();
  const { campaignId = '', characterId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error } = useAppSelector((s) => s.characters);
  const attributes = useAppSelector((s) => s.campaignAttributes.list);
  const factions = useAppSelector((s) => s.factions.list);
  const isMaster = useIsCampaignMaster(campaignId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [ignoreArt, setIgnoreArt] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    setBudgetInput(
      selected?.attributePointsBudget != null
        ? String(selected.attributePointsBudget)
        : '',
    );
  }, [selected?.attributePointsBudget]);

  useEffect(() => {
    if (campaignId && characterId) {
      dispatch(fetchCharacter({ campaignId, characterId }));
      dispatch(fetchAttributes(campaignId));
      dispatch(fetchFactions(campaignId));
    }
    return () => {
      dispatch(clearSelectedCharacter());
    };
  }, [campaignId, characterId, dispatch]);

  // Realtime portrait updates — no aggressive polling.
  useEffect(() => {
    if (!campaignId || !characterId) return;
    const rooms = [`character:${characterId}`, `campaign:${campaignId}`];
    const handler = (event: string) => (payload: unknown) => {
      const p = payload as {
        characterId?: string;
        imageUrl?: string;
        errorMessage?: string;
      };
      if (p?.characterId !== characterId) return;
      dispatch(
        characterImageUpdate({
          characterId,
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
  }, [campaignId, characterId, dispatch]);

  const attrName = useMemo(() => {
    const map = new Map(attributes.map((a) => [a.id, a.name]));
    return (id: string) => map.get(id) ?? id;
  }, [attributes]);

  const c = selected?.id === characterId ? selected : null;
  const inFlight = c?.imageStatus === 'pending' || c?.imageStatus === 'processing';
  useImageFallbackPoll(!!inFlight, () =>
    dispatch(fetchCharacter({ campaignId, characterId })),
  );

  if (loading && !c) return <Loading block label={t('character.detail.loading')} />;
  if (!c) {
    return (
      <>
        <BackRow>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/characters`)}>
            {t('character.detail.back')}
          </Button>
        </BackRow>
        {error && <Alert variant="error">{t('character.detail.notFound')}</Alert>}
      </>
    );
  }

  const factionName = c.factionId ? factions.find((f) => f.id === c.factionId)?.name : undefined;
  const generating = c.imageStatus === 'pending' || c.imageStatus === 'processing';

  const toggleVisibility = () =>
    dispatch(updateCharacter({ campaignId, characterId, input: { isVisibleToPlayers: !c.isVisibleToPlayers } }));
  const generate = () => dispatch(generateCharacterImage({ campaignId, characterId }));
  const submitAdjust = () => {
    dispatch(
      regenerateCharacterImage({
        campaignId,
        characterId,
        adjustments: adjustText.trim() || undefined,
        ignoreCampaignArtDirection: ignoreArt,
      }),
    );
    setAdjustOpen(false);
    setAdjustText('');
    setIgnoreArt(false);
  };
  const doDelete = () =>
    dispatch(removeCharacter({ campaignId, characterId }))
      .unwrap()
      .then(() => navigate(`/campaigns/${campaignId}/characters`, { replace: true }))
      .catch(() => setConfirmDelete(false));

  const lore: { key: string; value: string | null }[] = [
    { key: 'description', value: c.description },
    { key: 'appearance', value: c.appearance },
    { key: 'personality', value: c.personality },
    { key: 'motivations', value: c.motivations },
    { key: 'history', value: c.history },
    { key: 'secrets', value: c.secrets },
    { key: 'playerNotes', value: c.playerNotes },
    { key: 'notes', value: c.masterNotes },
  ];

  return (
    <>
      <BackRow>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaignId}/characters`)}>
          {t('character.detail.back')}
        </Button>
        {isMaster && (
          <Actions>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaignId}/characters/${characterId}/edit`)}>
              {t('character.detail.edit')}
            </Button>
            {confirmDelete ? (
              <>
                <Button size="sm" variant="danger" loading={saving} onClick={doDelete}>
                  {t('character.detail.confirmDelete')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  {t('character.form.cancel')}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
                {t('character.detail.delete')}
              </Button>
            )}
          </Actions>
        )}
      </BackRow>

      <Head>
        <Portrait>
          {c.imageUrl ? <img src={c.imageUrl} alt={c.name} /> : <CompassIcon size={48} />}
        </Portrait>
        <Titles>
          <Badges>
            {factionName && <Badge $tone="primary">{factionName}</Badge>}
            {isMaster && (
              <Badge $tone={c.isVisibleToPlayers ? 'success' : 'neutral'}>
                {t(c.isVisibleToPlayers ? 'character.visibility.public' : 'character.visibility.private')}
              </Badge>
            )}
            {c.imageStatus !== 'none' && c.imageStatus !== 'completed' && (
              <Badge $tone={c.imageStatus === 'failed' ? 'danger' : 'info'}>
                {t(`character.imageStatus.${c.imageStatus}`)}
              </Badge>
            )}
          </Badges>
          <Name>{c.name}</Name>
          {c.title && <Title>{c.title}</Title>}
          {c.shortDescription && <Prose>{c.shortDescription}</Prose>}

          {isMaster && (
            <Actions>
              {c.imageStatus === 'completed' ? (
                <Button size="sm" variant="secondary" onClick={() => setAdjustOpen((o) => !o)}>
                  {t('character.detail.requestChange')}
                </Button>
              ) : (
                <Button size="sm" variant="secondary" loading={generating || saving} disabled={generating || saving} onClick={generate}>
                  {t('character.detail.generate')}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={toggleVisibility} disabled={saving}>
                {t(c.isVisibleToPlayers ? 'character.detail.makePrivate' : 'character.detail.makePublic')}
              </Button>
            </Actions>
          )}
          {isMaster && adjustOpen && (
            <AdjustBox>
              <Hint>{t('character.detail.adjustHelp')}</Hint>
              <Textarea
                value={adjustText}
                placeholder={t('character.detail.adjustPlaceholder')}
                onChange={(e) => setAdjustText(e.target.value)}
              />
              <Examples>
                <li>{t('character.detail.adjustExample1')}</li>
                <li>{t('character.detail.adjustExample2')}</li>
                <li>{t('character.detail.adjustExample3')}</li>
              </Examples>
              <Switch
                label={t('character.fields.ignoreArtDirection')}
                checked={ignoreArt}
                onChange={(e) => setIgnoreArt(e.target.checked)}
              />
              <Actions>
                <Button size="sm" loading={generating || saving} disabled={generating || saving} onClick={submitAdjust}>
                  {t('character.detail.generateVersion')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>
                  {t('character.form.cancel')}
                </Button>
              </Actions>
            </AdjustBox>
          )}
          {c.imageStatus === 'failed' && c.imageError && (
            <Alert variant="error">{c.imageError}</Alert>
          )}
        </Titles>
      </Head>

      {isMaster && c.isPlayerCharacter && (
        <Chapter>
          <ChapterHeading eyebrow={t('playerCharacter.badge')} title={t('playerCharacter.budget.title')} />
          <Actions>
            <Input
              type="number"
              inputMode="numeric"
              value={budgetInput}
              placeholder={t('playerCharacter.budget.placeholder')}
              onChange={(e) => setBudgetInput(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <Button
              size="sm"
              loading={saving}
              onClick={() =>
                dispatch(
                  setCharacterBudget({
                    campaignId,
                    characterId,
                    attributePointsBudget:
                      budgetInput.trim() === '' ? null : Number(budgetInput),
                  }),
                )
              }
            >
              {t('playerCharacter.budget.save')}
            </Button>
          </Actions>
          <Hint>{t('playerCharacter.budget.hint')}</Hint>
        </Chapter>
      )}

      {c.attributes.length > 0 && (
        <Chapter>
          <ChapterHeading eyebrow={t('character.detail.attributesEyebrow')} title={t('character.detail.attributesTitle')} />
          <AttrList>
            {c.attributes.map((a) => (
              <Attr key={a.attributeId}>
                <AttrName>{attrName(a.attributeId)}</AttrName>
                <AttrValue>{a.value}</AttrValue>
              </Attr>
            ))}
          </AttrList>
        </Chapter>
      )}

      {lore
        .filter((x) => x.value)
        .map((entry) => (
          <Chapter key={entry.key}>
            <ChapterHeading title={t(`character.fields.${entry.key}`)} />
            <Prose>{entry.value}</Prose>
          </Chapter>
        ))}

      {isMaster && (
        <Chapter>
          <ChapterHeading eyebrow={t('ability.character.eyebrow')} title={t('ability.character.title')} />
          <CharacterAbilitiesSection campaignId={campaignId} characterId={characterId} mode="master" />
        </Chapter>
      )}

      <Divider variant="ornament" />
    </>
  );
}
