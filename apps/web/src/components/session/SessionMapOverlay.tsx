import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { CampaignMap } from '../../types/map';

/**
 * Discreet HUD over the game viewport: the map name (and type) as a translucent
 * pill in a corner. Overlay only — it never takes layout space from the board.
 */

const Bar = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.spacing.md};
  top: ${({ theme }) => theme.spacing.md};
  z-index: 40;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  max-width: min(70%, 460px);
  padding: ${({ theme }) => `${theme.spacing.xxs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 78%, transparent);
  border: 1px solid ${({ theme }) => theme.colors.border};
  backdrop-filter: blur(4px);
  pointer-events: none;
`;

const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Type = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  white-space: nowrap;
`;

interface SessionMapOverlayProps {
  map: CampaignMap | null;
}

export function SessionMapOverlay({ map }: SessionMapOverlayProps) {
  const { t } = useTranslation();
  return (
    <Bar>
      <Name>{map ? map.name : t('session.noMap')}</Name>
      {map?.type && <Type>{t(`map.type.${map.type}`, map.type)}</Type>}
    </Bar>
  );
}
