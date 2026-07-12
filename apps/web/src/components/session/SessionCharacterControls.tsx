import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, IconButton } from '../ui';
import {
  SessionCharacter,
  SpriteDirection,
  SIZE_SCALE_MIN,
  SIZE_SCALE_MAX,
  SIZE_SCALE_STEP,
} from '../../types/session';

/**
 * Compact master panel for the selected placed character: flip facing, toggle
 * player visibility, (re)generate its sprites, or remove it from the map.
 * Utilitarian by design — this is an in-game control, not a form.
 */
const Panel = styled.div`
  position: absolute;
  left: 50%;
  bottom: ${({ theme }) => theme.spacing.md};
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  max-width: calc(100% - ${({ theme }) => theme.spacing.lg});
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 90%, transparent);
  border: 1px solid ${({ theme }) => theme.colors.border};
  backdrop-filter: blur(6px);
  box-shadow: ${({ theme }) => theme.shadow.md};
`;

const Label = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Size control group: −, slider, +, and a discreet percentage. */
const SizeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const SizeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
`;

const Slider = styled.input`
  width: clamp(96px, 22vw, 160px);
  accent-color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  /* Comfortable touch target on mobile. */
  height: 24px;
`;

const Value = styled.span`
  min-width: 34px;
  text-align: right;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const clamp = (n: number) =>
  Math.min(SIZE_SCALE_MAX, Math.max(SIZE_SCALE_MIN, Math.round(n * 100) / 100));

interface Props {
  character: SessionCharacter;
  onSetFacing: (facing: SpriteDirection) => void;
  onToggleVisibility: () => void;
  onRegenerate: () => void;
  onRemove: () => void;
  onResize: (sizeScale: number) => void;
  onOpenSheet: () => void;
  onOpenInventory: () => void;
  onOpenAbilities: () => void;
  onClose: () => void;
}

export function SessionCharacterControls({
  character,
  onSetFacing,
  onToggleVisibility,
  onRegenerate,
  onRemove,
  onResize,
  onOpenSheet,
  onOpenInventory,
  onOpenAbilities,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const scale = character.sizeScale;
  return (
    <Panel>
      <Label>{character.characterName}</Label>
      <SizeGroup>
        <SizeLabel>{t('session.characters.size')}</SizeLabel>
        <IconButton
          size="sm"
          variant="solid"
          label={t('session.characters.smaller')}
          icon={<span aria-hidden="true">−</span>}
          onClick={() => onResize(clamp(scale - SIZE_SCALE_STEP))}
        />
        <Slider
          type="range"
          min={SIZE_SCALE_MIN}
          max={SIZE_SCALE_MAX}
          step={SIZE_SCALE_STEP}
          value={scale}
          aria-label={t('session.characters.size')}
          onChange={(e) => onResize(clamp(Number(e.target.value)))}
        />
        <IconButton
          size="sm"
          variant="solid"
          label={t('session.characters.larger')}
          icon={<span aria-hidden="true">+</span>}
          onClick={() => onResize(clamp(scale + SIZE_SCALE_STEP))}
        />
        <Value>{Math.round(scale * 100)}%</Value>
      </SizeGroup>
      <Button
        size="sm"
        variant={character.facing === 'FRONT' ? 'primary' : 'ghost'}
        onClick={() => onSetFacing('FRONT')}
      >
        {t('session.characters.front')}
      </Button>
      <Button
        size="sm"
        variant={character.facing === 'BACK' ? 'primary' : 'ghost'}
        onClick={() => onSetFacing('BACK')}
      >
        {t('session.characters.back')}
      </Button>
      <Button size="sm" variant="secondary" onClick={onOpenSheet}>
        {t('session.sheet.open')}
      </Button>
      <Button size="sm" variant="secondary" onClick={onOpenInventory}>
        {t('session.inventory.open')}
      </Button>
      <Button size="sm" variant="secondary" onClick={onOpenAbilities}>
        {t('session.abilities.open')}
      </Button>
      {/* Only NPCs can be hidden from players — player characters are always shown. */}
      {!character.isPlayerCharacter && (
        <Button size="sm" variant="secondary" onClick={onToggleVisibility}>
          {character.isVisibleToPlayers
            ? t('session.characters.hide')
            : t('session.characters.show')}
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onRegenerate}>
        {t('session.characters.regenerate')}
      </Button>
      <Button size="sm" variant="ghost" onClick={onRemove}>
        {t('session.characters.remove')}
      </Button>
      <Button size="sm" variant="ghost" onClick={onClose}>
        {t('common.close')}
      </Button>
    </Panel>
  );
}
