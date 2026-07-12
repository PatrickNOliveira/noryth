import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Loading, EmptyState, Badge } from '../ui';
import { CompassIcon } from '../icons';
import { characterFormService } from '../../services/characterForm.service';
import { CharacterForm } from '../../types/characterForm';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  max-height: 55vh;
  overflow-y: auto;
`;
const Row = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; }
`;
const Thumb = styled.div`
  width: 40px;
  height: 52px;
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
  characterId: string | null;
  activeFormId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPick: (form: CharacterForm) => void;
}

export function ChangeFormModal({
  campaignId,
  characterId,
  activeFormId,
  isOpen,
  onClose,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const [forms, setForms] = useState<CharacterForm[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !characterId) return;
    setLoading(true);
    setForms(null);
    let cancelled = false;
    characterFormService
      .list(campaignId, characterId)
      .then((f) => !cancelled && setForms(f))
      .catch(() => !cancelled && setForms([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, characterId, campaignId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.form.title')}>
      {loading && <Loading block label={t('session.form.loading')} />}
      {forms && !loading && (
        forms.length === 0 ? (
          <EmptyState
            icon={<CompassIcon size={32} />}
            title={t('session.form.emptyTitle')}
            description={t('session.form.emptyDescription')}
          />
        ) : (
          <List>
            {forms.map((f) => (
              <Row
                key={f.id}
                type="button"
                $active={f.id === activeFormId}
                onClick={() => onPick(f)}
              >
                <Thumb>
                  {f.imageUrl ? <img src={f.imageUrl} alt={f.name} /> : <CompassIcon size={18} />}
                </Thumb>
                <Info>
                  <Name>{f.name}</Name>
                  {f.shortDescription && <Short>{f.shortDescription}</Short>}
                </Info>
                {f.id === activeFormId && (
                  <Badge $tone="success">{t('session.form.active')}</Badge>
                )}
              </Row>
            ))}
          </List>
        )
      )}
    </Modal>
  );
}
