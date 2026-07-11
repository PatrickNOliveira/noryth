import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, EmptyState, Spinner } from '../ui';
import { CompassIcon } from '../icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCharacters } from '../../store/slices/characters.slice';
import { Character } from '../../types/character';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-height: 50vh;
  overflow-y: auto;
`;

const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Thumb = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
`;

interface Props {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Character ids already on the map (disabled in the list). */
  placedCharacterIds: string[];
  /** Character ids whose add request is still pending (disabled + spinner). */
  pendingCharacterIds: string[];
  /** Place a character on the map (handled optimistically by the parent). */
  onPick: (character: Character) => void;
}

export function AddSessionCharacterModal({
  campaignId,
  isOpen,
  onClose,
  placedCharacterIds,
  pendingCharacterIds,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.characters);

  useEffect(() => {
    if (isOpen) dispatch(fetchCharacters(campaignId));
  }, [isOpen, campaignId, dispatch]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.characters.addTitle')}>
      {loading && list.length === 0 ? (
        <Loading block label={t('session.characters.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<CompassIcon size={32} />}
          title={t('session.characters.emptyTitle')}
          description={t('session.characters.emptyDescription')}
        />
      ) : (
        <List>
          {list.map((c) => {
            const placed = placedCharacterIds.includes(c.id);
            const pending = pendingCharacterIds.includes(c.id);
            return (
              <Row
                key={c.id}
                disabled={placed || pending}
                onClick={() => onPick(c)}
              >
                <Thumb>
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} />
                  ) : (
                    <CompassIcon size={18} />
                  )}
                </Thumb>
                <Name>{c.name}</Name>
                {pending && <Spinner $size={16} />}
                {placed && !pending && (
                  <span>· {t('session.characters.alreadyPlaced')}</span>
                )}
              </Row>
            );
          })}
        </List>
      )}
    </Modal>
  );
}
