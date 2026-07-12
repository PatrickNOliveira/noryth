import { PointerEvent } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { SessionCharacter } from '../../types/session';

/**
 * A character standing on the session map: a full-body 2.5D sprite, anchored at
 * the FEET (x/y marks where it stands). The anchor wraps ONLY the sprite, so its
 * bottom edge sits exactly on the point — the shadow and name tag are absolutely
 * positioned and never shift the anchor. Resizing (via `sizeScale`) scales the
 * height only (width follows, keeping the image aspect), growing UPWARD from the
 * feet. Depth is faked with z-index from `y`. Draggable only for the master.
 */

/** Base render height at scale 1.0; the map scale multiplies this. */
const BASE_HEIGHT = 'clamp(80px, 12vw, 170px)';

const Anchor = styled.div<{
  $left: number;
  $top: number;
  $z: number;
  $height: string;
  $draggable: boolean;
  $selected: boolean;
  $optimistic: boolean;
}>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  top: ${({ $top }) => $top}%;
  z-index: ${({ $z }) => $z};
  height: ${({ $height }) => $height};
  transform: translate(-50%, -100%);
  cursor: ${({ $draggable }) => ($draggable ? 'grab' : 'default')};
  touch-action: none;
  user-select: none;
  opacity: ${({ $optimistic }) => ($optimistic ? 0.65 : 1)};
  filter: ${({ $selected }) =>
    $selected ? 'drop-shadow(0 0 4px rgba(220,190,120,0.95))' : 'none'};

  &:active {
    cursor: ${({ $draggable }) => ($draggable ? 'grabbing' : 'default')};
  }
`;

const Sprite = styled.img<{ $regenerating: boolean }>`
  height: 100%;
  width: auto;
  display: block;
  pointer-events: none;
  filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.6));
  /* Keep the old sprite visible while a new one generates — just dim it. */
  opacity: ${({ $regenerating }) => ($regenerating ? 0.55 : 1)};
  transition: opacity ${({ theme }) => theme.transitions.fast};
`;

/** Small pulsing dot shown over the sprite while its image is (re)generating. */
const RegenDot = styled.div`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: 0 0 0 2px color-mix(in srgb, ${({ theme }) => theme.colors.surface} 70%, transparent);
  pointer-events: none;
  animation: sprite-regen-pulse 1s ease-in-out infinite;

  @keyframes sprite-regen-pulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
`;

const Placeholder = styled.div`
  height: 100%;
  aspect-ratio: 3 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(
    160deg,
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 45%, black),
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 15%, black)
  );
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 55%, black);
  box-shadow: 0 3px 6px -2px rgba(0, 0, 0, 0.7);
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: 1.4em;
  color: ${({ theme }) => theme.colors.surface};
`;

/**
 * "Hidden from players" marker — only the master ever renders a character with
 * isVisibleToPlayers = false (players never receive them), so its mere presence
 * tells the master the token is on the map but concealed.
 */
const HiddenBadge = styled.div`
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 85%, transparent);
  border: 1px dashed ${({ theme }) => theme.colors.textMuted};
  font-size: 10px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  pointer-events: none;
`;

/** Oval shadow at the feet — absolute so it doesn't affect the anchor height. */
const Shadow = styled.div`
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 62%;
  height: 9px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.5), transparent 70%);
  pointer-events: none;
`;

const NameTag = styled.div<{ $hidden: boolean }>`
  position: absolute;
  top: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  max-width: 120px;
  padding: 0 ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 78%, transparent);
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${({ $hidden }) => ($hidden ? 0.55 : 1)};
  pointer-events: none;
`;

interface Props {
  character: SessionCharacter;
  selected: boolean;
  draggable: boolean;
  onPointerDown?: (e: PointerEvent, character: SessionCharacter) => void;
  onSelect?: (character: SessionCharacter) => void;
}

export function SessionCharacterSprite({
  character,
  selected,
  draggable,
  onPointerDown,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const sprite = character.sprites.find((s) => s.direction === character.facing);
  // Show the current image whenever one exists — even while a new one is being
  // generated — so the character never disappears during regeneration. Only fall
  // back to the placeholder when there is genuinely no image yet.
  const hasImage = !!sprite?.imageUrl;
  // Gated by the BOUNDED isRegenerating flag so the indicator can never stick
  // forever if a job/event is lost (the flag auto-clears via a fallback timeout).
  const regenerating =
    !!character.isRegenerating &&
    (sprite?.imageStatus === 'pending' || sprite?.imageStatus === 'processing');
  const initial = character.characterName.trim().charAt(0).toUpperCase() || '•';
  const z = Math.round(character.y * 100);
  const height = `calc(${BASE_HEIGHT} * ${character.sizeScale})`;

  return (
    <Anchor
      $left={character.x}
      $top={character.y}
      $z={z}
      $height={height}
      $draggable={draggable}
      $selected={selected}
      $optimistic={!!character.isOptimistic}
      onPointerDown={(e) => {
        onSelect?.(character);
        if (draggable) onPointerDown?.(e, character);
      }}
    >
      {!character.isVisibleToPlayers && (
        <HiddenBadge>{t('session.characters.hiddenTag')}</HiddenBadge>
      )}
      {hasImage ? (
        <Sprite
          src={sprite!.imageUrl as string}
          alt={character.characterName}
          $regenerating={regenerating}
        />
      ) : (
        <Placeholder>{initial}</Placeholder>
      )}
      {regenerating && <RegenDot />}
      <Shadow />
      <NameTag $hidden={!character.isVisibleToPlayers}>{character.characterName}</NameTag>
    </Anchor>
  );
}
