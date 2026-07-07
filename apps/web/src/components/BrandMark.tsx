import styled, { css } from 'styled-components';

type BrandSize = 'md' | 'lg' | 'hero';

const sizeStyles = {
  md: css`
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
  `,
  lg: css`
    font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  `,
  hero: css`
    /* Fluid so the wordmark never overflows narrow phones. */
    font-size: clamp(2rem, 9vw, ${({ theme }) => theme.typography.fontSize.hero});
  `,
};

/** Engraved wordmark for Noryth — Cinzel display serif with a bronze glyph. */
const Wordmark = styled.h1<{ $size: BrandSize }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.display};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  line-height: 1;
  color: ${({ theme }) => theme.colors.text};

  ${({ $size }: { $size: BrandSize }) => sizeStyles[$size]}

  span {
    color: ${({ theme }) => theme.colors.primary};
    text-shadow: ${({ theme }) => theme.shadow.glow};
  }
`;

export function BrandMark({
  size = 'lg',
  className,
}: {
  size?: BrandSize;
  className?: string;
}) {
  return (
    <Wordmark $size={size} className={className}>
      Nor<span>y</span>th
    </Wordmark>
  );
}
