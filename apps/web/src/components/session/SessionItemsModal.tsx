import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Input, Loading, EmptyState, Badge } from '../ui';
import { BookIcon } from '../icons';
import { itemService } from '../../services/item.service';
import { ItemDefinitionListItem } from '../../types/item';
import { SessionItemSheetModal } from './SessionItemSheetModal';

const Search = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;
const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-height: 55vh;
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
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const Thumb = styled.div`
  width: 40px;
  height: 40px;
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
  min-width: 0;
  flex: 1;
`;
const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
  flex-wrap: wrap;
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
`;
const Short = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface Props {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Master-only session items manager: the campaign's items with instance counts
 * and a debounced name search. Clicking an item opens its full sheet with
 * instances and transfer/unassign actions.
 */
export function SessionItemsModal({ campaignId, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [list, setList] = useState<ItemDefinitionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(
    (term: string) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setLoading(true);
      itemService
        .sessionList(campaignId, term.trim() || undefined, c.signal)
        .then((data) => setList(data))
        .catch((err) => {
          if ((err as { message?: string })?.message !== 'canceled') setList([]);
        })
        .finally(() => {
          if (controller.current === c) setLoading(false);
        });
    },
    [campaignId],
  );

  // Load on open and whenever the (debounced) search term changes.
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => load(search), 300);
    return () => window.clearTimeout(timer);
  }, [isOpen, search, load]);

  useEffect(() => {
    if (isOpen) setSearch('');
    else controller.current?.abort();
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={t('session.items.title')}>
      <Search>
        <Input
          value={search}
          placeholder={t('session.items.search')}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Search>

      {loading && list.length === 0 ? (
        <Loading block label={t('session.items.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<BookIcon size={32} />}
          title={t('session.items.emptyTitle')}
          description={t('session.items.emptyDescription')}
        />
      ) : (
        <List>
          {list.map((it) => (
            <Row key={it.id} type="button" onClick={() => setSelectedId(it.id)}>
              <Thumb>
                {it.imageUrl ? <img src={it.imageUrl} alt={it.name} /> : <BookIcon size={18} />}
              </Thumb>
              <Info>
                <TopLine>
                  <Name>{it.name}</Name>
                  {it.type && <Badge $tone="primary">{t(`item.type.${it.type}`, it.type)}</Badge>}
                  {it.isUnique && <Badge $tone="accent">{t('session.itemSheet.unique')}</Badge>}
                  <Badge $tone="neutral">
                    {t('session.items.instanceCount', { count: it.instanceCount })}
                  </Badge>
                </TopLine>
                {it.shortDescription && <Short>{it.shortDescription}</Short>}
              </Info>
            </Row>
          ))}
        </List>
      )}

      <SessionItemSheetModal
        campaignId={campaignId}
        itemDefinitionId={selectedId}
        isOpen={!!selectedId}
        onClose={() => {
          setSelectedId(null);
          load(search); // refresh instance counts after any change
        }}
      />
    </Modal>
  );
}
