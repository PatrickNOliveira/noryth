import React from 'react';
import styled from 'styled-components';

const sizeMap = {
  sm: '32px',
  md: '44px',
  lg: '64px',
};

const Root = styled.span<{ $size: keyof typeof sizeMap }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: ${({ $size }: { $size: keyof typeof sizeMap }) => sizeMap[$size]};
  height: ${({ $size }: { $size: keyof typeof sizeMap }) => sizeMap[$size]};
  border-radius: ${({ theme }) => theme.radius.pill};
  overflow: hidden;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.surfaceAlt},
    ${({ theme }) => theme.colors.backgroundAlt}
  );
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  user-select: none;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof sizeMap;
  className?: string;
}

/**
 * Round portrait for a player, character or NPC. Falls back to monogram
 * initials on the aged-surface gradient when no image is provided.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <Root $size={size} className={className} title={name}>
      {src ? <img src={src} alt={name} /> : initials(name)}
    </Root>
  );
}
