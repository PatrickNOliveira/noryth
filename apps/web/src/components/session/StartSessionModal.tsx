import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Button, Select, Alert, Loading, FormField } from '../ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMaps } from '../../store/slices/maps.slice';
import { startSession } from '../../store/slices/session.slice';
import { CampaignSession } from '../../types/session';

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

interface StartSessionModalProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onStarted: (session: CampaignSession) => void;
}

/**
 * Master-only dialog to start a session. Lists the campaign's maps, requires an
 * initial map, and starts (or resumes) the session. With no maps it blocks and
 * tells the master to create one first.
 */
export function StartSessionModal({
  campaignId,
  isOpen,
  onClose,
  onStarted,
}: StartSessionModalProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.maps);
  const { starting, error } = useAppSelector((s) => s.session);
  const [mapId, setMapId] = useState('');

  useEffect(() => {
    if (isOpen) dispatch(fetchMaps(campaignId));
  }, [isOpen, campaignId, dispatch]);

  useEffect(() => {
    if (isOpen && !mapId && list.length > 0) setMapId(list[0].id);
  }, [isOpen, list, mapId]);

  const hasMaps = list.length > 0;

  const start = () => {
    if (!mapId) return;
    dispatch(startSession({ campaignId, initialMapId: mapId }))
      .unwrap()
      .then((session) => {
        onClose();
        onStarted(session);
      })
      .catch(() => {});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('session.start.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('session.start.cancel')}
          </Button>
          <Button onClick={start} loading={starting} disabled={!hasMaps || !mapId}>
            {t('session.start.confirm')}
          </Button>
        </>
      }
    >
      <Body>
        {error && <Alert variant="error">{error}</Alert>}
        {loading && list.length === 0 ? (
          <Loading block label={t('session.start.loadingMaps')} />
        ) : hasMaps ? (
          <FormField label={t('session.start.mapLabel')}>
            {({ id }) => (
              <Select
                id={id}
                value={mapId}
                onChange={(e) => setMapId(e.target.value)}
              >
                {list.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        ) : (
          <Alert variant="warning">{t('session.start.noMaps')}</Alert>
        )}
      </Body>
    </Modal>
  );
}
