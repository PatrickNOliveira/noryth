import { SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, IconButton } from '../ui';
import { CloseIcon } from '../icons';
import { media } from '../../styles/media';
import {
  SessionCharacter,
  SpriteDirection,
  SIZE_SCALE_MIN,
  SIZE_SCALE_MAX,
  SIZE_SCALE_STEP,
} from '../../types/session';

/**
 * MOBILE ONLY bottom sheet for the selected placed character. Replaces the
 * cramped floating pill ({@link SessionCharacterControls}) on phones with a clean,
 * thumb-friendly drawer: name + active form, size control, facing, and every
 * action. Pure presentation — it reuses the exact same handlers as the desktop
 * panel, so no business rule changes. Hidden from `tablet` up (desktop keeps the
 * pill). No heavy overlay: the map stays visible/usable above the sheet.
 */

/**
 * How long the sheet ignores input right after opening. The tap that opened it —
 * and the ghost `click` mobile browsers fire ~after touchend — must NOT land on a
 * button that just mounted under the finger. 250ms is imperceptible to a user who
 * genuinely wants to press a button, but comfortably covers the ghost click.
 */
const INPUT_LOCK_MS = 250;
const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  max-height: 60vh;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.md};
  /* Respect the phone's home-indicator inset. */
  padding-bottom: calc(${({ theme }) => theme.spacing.md} + env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 20px 20px 0 0;
  box-shadow: ${({ theme }) => theme.shadow.lg};

  ${media.tablet} {
    display: none;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const HeadInfo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const Name = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const FormLine = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const RowLabel = styled.span`
  flex: 0 0 auto;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.textMuted};
`;
const Slider = styled.input`
  flex: 1 1 auto;
  min-width: 0;
  height: 28px;
  accent-color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`;
const SizeValue = styled.span`
  flex: 0 0 auto;
  min-width: 42px;
  text-align: right;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

/** Two-column action grid; full-width rows span both columns. */
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const FullRow = styled.div`
  grid-column: 1 / -1;
`;
const ConfirmText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xxs};
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
  onOpenChangeForm: () => void;
  onClose: () => void;
}

export function SessionCharacterMobileActionSheet({
  character,
  onSetFacing,
  onToggleVisibility,
  onRegenerate,
  onRemove,
  onResize,
  onOpenSheet,
  onOpenInventory,
  onOpenAbilities,
  onOpenChangeForm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Armed on every open (and re-armed when a different character opens). While
  // true the sheet swallows all input in the CAPTURE phase — see `guard` — so the
  // opening tap / ghost click can't trigger any button.
  const [inputLocked, setInputLocked] = useState(true);
  const scale = character.sizeScale;

  // Reset the destructive-confirm step AND re-arm the input lock whenever the
  // selected character changes (each open starts fresh: no stale confirm, locked).
  useEffect(() => {
    setConfirmRemove(false);
    setInputLocked(true);
    const timer = window.setTimeout(() => setInputLocked(false), INPUT_LOCK_MS);
    return () => window.clearTimeout(timer);
  }, [character.id]);

  // Capture-phase guard on the sheet root: while locked, stop the event before it
  // reaches any descendant button (capture runs root→target, so stopping here
  // means no button handler fires). After the short window it's a no-op.
  const guard = (e: SyntheticEvent) => {
    if (inputLocked) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Per-character/direction: the regenerate button reflects ONLY this character's
  // facing sprite — it never disables because another character is regenerating.
  const facingSprite = character.sprites.find((s) => s.direction === character.facing);
  const regenerating =
    !!character.isRegenerating &&
    (facingSprite?.imageStatus === 'pending' ||
      facingSprite?.imageStatus === 'processing');

  return (
    <Sheet
      role="dialog"
      aria-label={character.characterName}
      data-input-locked={inputLocked}
      onPointerDownCapture={guard}
      onPointerUpCapture={guard}
      onClickCapture={guard}
    >
      <Header>
        <HeadInfo>
          <Name>{character.characterName}</Name>
          {character.activeForm && (
            <FormLine>
              {t('session.form.activeLabel')}: {character.activeForm.name}
            </FormLine>
          )}
        </HeadInfo>
        <IconButton
          size="md"
          variant="subtle"
          label={t('common.close')}
          icon={<CloseIcon size={18} />}
          onClick={onClose}
        />
      </Header>

      <Row>
        <RowLabel>{t('session.characters.size')}</RowLabel>
        <IconButton
          size="md"
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
          size="md"
          variant="solid"
          label={t('session.characters.larger')}
          icon={<span aria-hidden="true">+</span>}
          onClick={() => onResize(clamp(scale + SIZE_SCALE_STEP))}
        />
        <SizeValue>{Math.round(scale * 100)}%</SizeValue>
      </Row>

      <Grid>
        <Button
          fullWidth
          variant={character.facing === 'FRONT' ? 'primary' : 'ghost'}
          onClick={() => onSetFacing('FRONT')}
        >
          {t('session.characters.front')}
        </Button>
        <Button
          fullWidth
          variant={character.facing === 'BACK' ? 'primary' : 'ghost'}
          onClick={() => onSetFacing('BACK')}
        >
          {t('session.characters.back')}
        </Button>
      </Grid>

      <Grid>
        <Button fullWidth variant="secondary" onClick={onOpenSheet}>
          {t('session.sheet.open')}
        </Button>
        <Button fullWidth variant="secondary" onClick={onOpenInventory}>
          {t('session.inventory.open')}
        </Button>
        <Button fullWidth variant="secondary" onClick={onOpenAbilities}>
          {t('session.abilities.open')}
        </Button>
        {character.formsCount > 1 && (
          <Button fullWidth variant="secondary" onClick={onOpenChangeForm}>
            {t('session.form.open')}
          </Button>
        )}
        {/* Only NPCs can be hidden from players — player characters are always shown. */}
        {!character.isPlayerCharacter && (
          <Button fullWidth variant="secondary" onClick={onToggleVisibility}>
            {character.isVisibleToPlayers
              ? t('session.characters.hide')
              : t('session.characters.show')}
          </Button>
        )}
        <FullRow>
          <Button
            fullWidth
            variant="ghost"
            onClick={onRegenerate}
            disabled={regenerating}
          >
            {t(
              regenerating
                ? 'session.characters.regeneratingButton'
                : 'session.characters.regenerate',
            )}
          </Button>
        </FullRow>
      </Grid>

      {/* Destructive: two-step confirm so a stray tap never drops the token. */}
      {confirmRemove ? (
        <div>
          <ConfirmText>{t('session.characters.removeConfirm')}</ConfirmText>
          <Grid>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => setConfirmRemove(false)}
            >
              {t('session.characters.cancel')}
            </Button>
            <Button fullWidth variant="danger" onClick={onRemove}>
              {t('session.characters.remove')}
            </Button>
          </Grid>
        </div>
      ) : (
        <Button fullWidth variant="danger" onClick={() => setConfirmRemove(true)}>
          {t('session.characters.remove')}
        </Button>
      )}
    </Sheet>
  );
}
