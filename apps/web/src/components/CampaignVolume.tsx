import styled, { css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Badge, BadgeTone } from './ui';
import { BookIcon } from './icons';
import { Campaign, CampaignStatus } from '../types/campaign';
import { themeLabelKey } from '../utils/campaignOptions';

const statusTone: Record<CampaignStatus, BadgeTone> = {
  active: 'success',
  paused: 'warning',
  archived: 'neutral',
};

const Root = styled.article<{ $feature: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $feature }) => ($feature ? '120px 1fr' : '84px 1fr')};
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.surface},
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, ${({ theme }) => theme.colors.surface})
  );
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.md},
    inset -3px 0 0 -1px color-mix(in srgb, ${({ theme }) => theme.colors.border} 60%, transparent);
  cursor: pointer;
  transition: transform ${({ theme }) => theme.transitions.normal},
    box-shadow ${({ theme }) => theme.transitions.normal},
    border-color ${({ theme }) => theme.transitions.normal};

  &:hover {
    transform: translateY(-3px) rotate(-0.3deg);
    box-shadow: ${({ theme }) => theme.shadow.lg};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  ${({ $feature }) =>
    $feature &&
    css`
      grid-template-columns: 140px 1fr;
      padding: ${({ theme }) => theme.spacing.lg};
    `}
`;

/** Book cover face — image or an engraved placeholder. */
const Cover = styled.div`
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: ${({ theme }) => theme.radius.sm};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 60%, transparent);

  /* Bronze spine along the binding edge. */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, ${({ theme }) => theme.colors.primary} 85%, black),
      ${({ theme }) => theme.colors.primary}
    );
  }

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
  gap: ${({ theme }) => theme.spacing.xxs};
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Name = styled.h3<{ $feature: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme, $feature }) =>
    $feature ? theme.typography.fontSize.xl : theme.typography.fontSize.lg};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.text};
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

interface CampaignVolumeProps {
  campaign: Campaign;
  onOpen: (id: string) => void;
  feature?: boolean;
}

/** A campaign on the shelf — a bound volume with cover, title and status. */
export function CampaignVolume({ campaign, onOpen, feature = false }: CampaignVolumeProps) {
  const { t } = useTranslation();
  const themeKey = themeLabelKey(campaign.theme);
  const themeLabel = themeKey ? t(themeKey) : campaign.theme;

  return (
    <Root
      $feature={feature}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(campaign.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(campaign.id);
        }
      }}
    >
      <Cover>
        {campaign.coverImageUrl ? (
          <img src={campaign.coverImageUrl} alt={campaign.name} loading="lazy" />
        ) : (
          <BookIcon size={feature ? 40 : 28} />
        )}
      </Cover>
      <Body>
        <TopRow>
          <Badge $tone="primary">{themeLabel}</Badge>
          <Badge $tone={statusTone[campaign.status]}>{t(`campaign.status.${campaign.status}`)}</Badge>
        </TopRow>
        <Name $feature={feature}>{campaign.name}</Name>
        <Description>{campaign.shortDescription}</Description>
      </Body>
    </Root>
  );
}
