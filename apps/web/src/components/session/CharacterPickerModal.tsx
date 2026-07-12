import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Input, Loading, EmptyState, Spinner } from '../ui';
import { CompassIcon } from '../icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCharacters } from '../../store/slices/characters.slice';
import { Character } from '../../types/character';

const Search = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;
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
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const Info = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
`;
const Meta = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface Props {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onPick: (character: Character) => void;
  /** Character whose action is in flight (row shows a spinner, all disabled). */
  pendingCharacterId?: string | null;
  title?: string;
}

/** Reusable campaign-character picker with name search (master flows). */
export function CharacterPickerModal({
  campaignId,
  isOpen,
  onClose,
  onPick,
  pendingCharacterId,
  title,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.characters);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      dispatch(fetchCharacters(campaignId));
    }
  }, [isOpen, campaignId, dispatch]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) => c.name.toLowerCase().includes(term));
  }, [list, search]);

  const busy = !!pendingCharacterId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? t('session.items.pickCharacter')}
    >
      <Search>
        <Input
          value={search}
          placeholder={t('session.items.searchCharacter')}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Search>
      {loading && list.length === 0 ? (
        <Loading block label={t('session.characters.loading')} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CompassIcon size={32} />}
          title={t('session.items.noCharacters')}
          description={t('session.items.noCharactersHint')}
        />
      ) : (
        <List>
          {filtered.map((c) => (
            <Row
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(c)}
            >
              <Thumb>
                {c.imageUrl ? <img src={c.imageUrl} alt={c.name} /> : <CompassIcon size={18} />}
              </Thumb>
              <Info>
                <Name>{c.name}</Name>
                <Meta>
                  {c.isPlayerCharacter
                    ? t('session.sheet.playerCharacter')
                    : t('session.sheet.npc')}
                  {c.title ? ` · ${c.title}` : ''}
                </Meta>
              </Info>
              {pendingCharacterId === c.id && <Spinner $size={16} />}
            </Row>
          ))}
        </List>
      )}
    </Modal>
  );
}
