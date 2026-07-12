import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Badge } from '../ui';
import { BookIcon } from '../icons';
import { ItemDefinition } from '../../types/item';

/**
 * Read-only item sheet: all the info of an item DEFINITION (not its instances).
 * Opened from a character's inventory row. No editing.
 */

const Head = styled.header`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;
const Thumb = styled.div`
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  img { width: 100%; height: 100%; object-fit: cover; }
`;
const HeadInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 0;
`;
const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
`;
const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xxs};
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.md};
`;
const SectionTitle = styled.h4`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.primary};
`;
const Prose = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

interface Props {
  item: ItemDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemSheetModal({ item, isOpen, onClose }: Props) {
  const { t } = useTranslation();

  const prose = (label: string, value?: string | null) =>
    value && value.trim() ? (
      <Section>
        <SectionTitle>{label}</SectionTitle>
        <Prose>{value}</Prose>
      </Section>
    ) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={t('session.itemSheet.title')}>
      {item && (
        <>
          <Head>
            <Thumb>
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <BookIcon size={28} />}
            </Thumb>
            <HeadInfo>
              <Name>{item.name}</Name>
              <Badges>
                {item.type && (
                  <Badge $tone="primary">{t(`item.type.${item.type}`, item.type)}</Badge>
                )}
                {item.isUnique && (
                  <Badge $tone="accent">{t('session.itemSheet.unique')}</Badge>
                )}
                <Badge $tone={item.isVisibleToPlayers ? 'success' : 'neutral'}>
                  {item.isVisibleToPlayers
                    ? t('session.itemSheet.visible')
                    : t('session.itemSheet.hidden')}
                </Badge>
              </Badges>
            </HeadInfo>
          </Head>

          {item.shortDescription && <Prose>{item.shortDescription}</Prose>}

          {prose(t('session.itemSheet.appearance'), item.appearance)}
          {prose(t('session.itemSheet.description'), item.description)}
          {prose(t('session.itemSheet.effect'), item.effectDescription)}
          {prose(t('session.itemSheet.rules'), item.rulesText)}
          {prose(t('session.itemSheet.history'), item.history)}
          {prose(t('session.itemSheet.masterNotes'), item.masterNotes)}
        </>
      )}
    </Modal>
  );
}
