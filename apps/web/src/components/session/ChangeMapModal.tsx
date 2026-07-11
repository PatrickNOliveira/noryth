import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, EmptyState, Badge } from '../ui';
import { MapIcon } from '../icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMaps } from '../../store/slices/maps.slice';
import { CampaignMap } from '../../types/map';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-height: 50vh;
  overflow-y: auto;
`;

const Row = styled.button<{ $current: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid
    ${({ theme, $current }) => ($current ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const Thumb = styled.div`
  width: 44px;
  height: 34px;
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

const Info = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
`;

const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface Props {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  currentMapId: string;
  onPick: (map: CampaignMap) => void;
}

export function ChangeMapModal({
  campaignId,
  isOpen,
  onClose,
  currentMapId,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.maps);

  useEffect(() => {
    if (isOpen) dispatch(fetchMaps(campaignId));
  }, [isOpen, campaignId, dispatch]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.changeMap.title')}>
      {loading && list.length === 0 ? (
        <Loading block label={t('session.changeMap.loading')} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<MapIcon size={32} />}
          title={t('session.changeMap.emptyTitle')}
          description={t('session.changeMap.emptyDescription')}
        />
      ) : (
        <List>
          {list.map((m) => {
            const current = m.id === currentMapId;
            return (
              <Row
                key={m.id}
                $current={current}
                disabled={current}
                onClick={() => onPick(m)}
              >
                <Thumb>
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} />
                  ) : (
                    <MapIcon size={18} />
                  )}
                </Thumb>
                <Info>
                  <Name>{m.name}</Name>
                </Info>
                {m.type && <Badge $tone="primary">{t(`map.type.${m.type}`, m.type)}</Badge>}
                {current && <Badge $tone="neutral">{t('session.changeMap.current')}</Badge>}
              </Row>
            );
          })}
        </List>
      )}
    </Modal>
  );
}
