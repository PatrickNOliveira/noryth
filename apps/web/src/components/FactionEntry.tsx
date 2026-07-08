import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Badge, BadgeTone } from './ui';
import { ShieldIcon } from './icons';
import { Faction, FactionStatus } from '../types/faction';
import { factionTypeLabelKey } from '../utils/factionOptions';

const statusTone: Record<FactionStatus, BadgeTone> = {
  draft: 'neutral',
  generating_symbol: 'info',
  pending_approval: 'warning',
  active: 'success',
  generation_failed: 'danger',
  archived: 'neutral',
};

const Root = styled.article`
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  cursor: pointer;
  transition: transform ${({ theme }) => theme.transitions.normal},
    box-shadow ${({ theme }) => theme.transitions.normal},
    border-color ${({ theme }) => theme.transitions.normal};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadow.md};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/** The faction's crest — image or an engraved shield placeholder. */
const Crest = styled.div`
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, ${({ theme }) => theme.colors.surfaceAlt});
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.primary};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Body = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const Motto = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.accent};
`;

const Desc = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

interface FactionEntryProps {
  faction: Faction;
  onOpen: (id: string) => void;
}

/** A single entry in the Book of Heraldry. */
export function FactionEntry({ faction, onOpen }: FactionEntryProps) {
  const { t } = useTranslation();
  const typeKey = factionTypeLabelKey(faction.type);
  const typeLabel = typeKey ? t(typeKey) : faction.type;

  return (
    <Root
      role="button"
      tabIndex={0}
      onClick={() => onOpen(faction.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(faction.id);
        }
      }}
    >
      <Crest>
        {faction.approvedImageUrl ? (
          <img src={faction.approvedImageUrl} alt={faction.name} loading="lazy" />
        ) : (
          <ShieldIcon size={30} />
        )}
      </Crest>
      <Body>
        <TopRow>
          <Badge $tone="primary">{typeLabel}</Badge>
          <Badge $tone={statusTone[faction.status]}>
            {t(`faction.status.${faction.status}`)}
          </Badge>
        </TopRow>
        <Name>{faction.name}</Name>
        {faction.motto && <Motto>“{faction.motto}”</Motto>}
        {faction.description && <Desc>{faction.description}</Desc>}
      </Body>
    </Root>
  );
}
