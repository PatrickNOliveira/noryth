import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, Badge, Loading, EmptyState } from './ui';
import { CompassIcon, PlusIcon } from './icons';
import { CharacterFormModal } from './CharacterFormModal';
import { characterFormService } from '../services/characterForm.service';
import { useImageFallbackPoll } from '../hooks/useImageFallbackPoll';
import {
  realtime,
  CHARACTER_FORM_IMAGE_EVENTS,
} from '../services/realtime';
import { CharacterForm } from '../types/characterForm';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Card = styled.div<{ $active: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
`;
const Thumb = styled.div`
  width: 56px;
  height: 72px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
`;
const Short = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;
const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

interface Props {
  campaignId: string;
  characterId: string;
}

export function CharacterFormsSection({ campaignId, characterId }: Props) {
  const { t } = useTranslation();
  const [forms, setForms] = useState<CharacterForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CharacterForm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return characterFormService
      .list(campaignId, characterId)
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId, characterId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime + fallback poll while a form image is generating.
  useEffect(() => {
    const room = `campaign:${campaignId}`;
    const handler = () => refresh();
    realtime.join(room);
    Object.values(CHARACTER_FORM_IMAGE_EVENTS).forEach((e) => realtime.on(e, handler));
    return () => {
      Object.values(CHARACTER_FORM_IMAGE_EVENTS).forEach((e) => realtime.off(e, handler));
      realtime.leave(room);
    };
  }, [campaignId, refresh]);

  const anyGenerating = forms.some(
    (f) => f.imageStatus === 'pending' || f.imageStatus === 'processing',
  );
  useImageFallbackPoll(anyGenerating, refresh);

  const upsert = (form: CharacterForm) =>
    setForms((prev) => {
      const i = prev.findIndex((f) => f.id === form.id);
      // Activating/defaulting affects the others too — simplest is a refresh.
      if (i >= 0) {
        const next = [...prev];
        next[i] = form;
        return next;
      }
      return [...prev, form];
    });

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const activate = (f: CharacterForm) =>
    run(f.id, () => characterFormService.activate(campaignId, characterId, f.id));
  const setDefault = (f: CharacterForm) =>
    run(f.id, () => characterFormService.setDefault(campaignId, characterId, f.id));
  const generate = (f: CharacterForm) =>
    run(f.id, () => characterFormService.generateImage(campaignId, characterId, f.id));
  const remove = (f: CharacterForm) =>
    run(f.id, () => characterFormService.remove(campaignId, characterId, f.id));

  if (loading) return <Loading block label={t('characterForm.loading')} />;

  return (
    <>
      <Actions>
        <Button size="sm" leftIcon={<PlusIcon size={16} />} onClick={() => { setEditing(null); setModalOpen(true); }}>
          {t('characterForm.new')}
        </Button>
      </Actions>

      {forms.length === 0 ? (
        <EmptyState
          icon={<CompassIcon size={32} />}
          title={t('characterForm.emptyTitle')}
          description={t('characterForm.emptyDescription')}
        />
      ) : (
        <List>
          {forms.map((f) => (
            <Card key={f.id} $active={f.isActive}>
              <Thumb>
                {f.imageUrl ? <img src={f.imageUrl} alt={f.name} /> : <CompassIcon size={22} />}
              </Thumb>
              <Info>
                <Name>{f.name}</Name>
                {f.shortDescription && <Short>{f.shortDescription}</Short>}
                <Badges>
                  {f.isActive && <Badge $tone="success">{t('characterForm.active')}</Badge>}
                  {f.isDefault && <Badge $tone="primary">{t('characterForm.default')}</Badge>}
                  {f.imageStatus !== 'none' && f.imageStatus !== 'completed' && (
                    <Badge $tone={f.imageStatus === 'failed' ? 'danger' : 'info'}>
                      {t(`character.imageStatus.${f.imageStatus}`)}
                    </Badge>
                  )}
                </Badges>
                <Actions>
                  {!f.isActive && (
                    <Button size="sm" variant="secondary" disabled={busyId === f.id} onClick={() => activate(f)}>
                      {t('characterForm.activate')}
                    </Button>
                  )}
                  {!f.isDefault && (
                    <Button size="sm" variant="ghost" disabled={busyId === f.id} onClick={() => setDefault(f)}>
                      {t('characterForm.setDefault')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busyId === f.id} onClick={() => generate(f)}>
                    {t('characterForm.generateImage')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(f); setModalOpen(true); }}>
                    {t('characterForm.edit')}
                  </Button>
                  {!f.isDefault && (
                    <Button size="sm" variant="ghost" disabled={busyId === f.id} onClick={() => remove(f)}>
                      {t('characterForm.remove')}
                    </Button>
                  )}
                </Actions>
              </Info>
            </Card>
          ))}
        </List>
      )}

      <CharacterFormModal
        campaignId={campaignId}
        characterId={characterId}
        form={editing}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(saved) => {
          upsert(saved);
          void refresh();
        }}
      />
    </>
  );
}
