import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, Alert, EmptyState, Badge } from '../ui';
import { BookIcon } from '../icons';
import { itemService } from '../../services/item.service';
import { ItemInstance, ItemDefinition } from '../../types/item';
import { ItemSheetModal } from './ItemSheetModal';

/**
 * Read-only inventory of a character, opened from the session (master only).
 * The inventory is the set of item instances whose holder is this character;
 * each instance's readable name comes from its definition (or a custom name).
 * Reuses existing item endpoints — no new backend. A small cache avoids refetch.
 */

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
  min-width: 0;
  flex: 1 1 auto;
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Desc = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Qty = styled.span`
  flex-shrink: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface Props {
  campaignId: string;
  characterId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface InventoryData {
  instances: ItemInstance[];
  definitions: Map<string, ItemDefinition>;
}

export function CharacterInventoryModal({ campaignId, characterId, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const cache = useRef(new Map<string, InventoryData>());
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDefinition | null>(null);

  useEffect(() => {
    if (!isOpen || !characterId) return;
    const cached = cache.current.get(characterId);
    if (cached) {
      setData(cached);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    setData(null);
    let cancelled = false;
    Promise.all([
      itemService.listInstancesByHolder(campaignId, characterId),
      itemService.list(campaignId),
    ])
      .then(([instances, defs]) => {
        if (cancelled) return;
        const definitions = new Map(defs.map((d) => [d.id, d]));
        const inv = { instances, definitions };
        cache.current.set(characterId, inv);
        setData(inv);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, characterId, campaignId]);

  const nameOf = (i: ItemInstance) =>
    i.customName?.trim() ||
    data?.definitions.get(i.itemDefinitionId)?.name ||
    t('session.inventory.unknownItem');
  const descOf = (i: ItemInstance) =>
    i.customDescription?.trim() ||
    data?.definitions.get(i.itemDefinitionId)?.shortDescription ||
    '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.inventory.title')}>
      {loading && <Loading block label={t('session.inventory.loading')} />}
      {error && !loading && (
        <Alert variant="error">{t('session.inventory.error')}</Alert>
      )}
      {data && !loading && (
        data.instances.length === 0 ? (
          <EmptyState
            icon={<BookIcon size={32} />}
            title={t('session.inventory.emptyTitle')}
            description={t('session.inventory.emptyDescription')}
          />
        ) : (
          <List>
            {data.instances.map((i) => {
              const def = data.definitions.get(i.itemDefinitionId);
              return (
                <Row
                  key={i.id}
                  type="button"
                  disabled={!def}
                  onClick={() => def && setSelectedItem(def)}
                >
                  <Thumb>
                    {def?.imageUrl ? (
                      <img src={def.imageUrl} alt={nameOf(i)} />
                    ) : (
                      <BookIcon size={20} />
                    )}
                  </Thumb>
                  <Info>
                    <Name>{nameOf(i)}</Name>
                    {descOf(i) && <Desc>{descOf(i)}</Desc>}
                  </Info>
                  {!i.isVisibleToPlayers && (
                    <Badge $tone="neutral">{t('session.inventory.hidden')}</Badge>
                  )}
                  {i.quantity > 1 && <Qty>×{i.quantity}</Qty>}
                </Row>
              );
            })}
          </List>
        )
      )}

      <ItemSheetModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </Modal>
  );
}
