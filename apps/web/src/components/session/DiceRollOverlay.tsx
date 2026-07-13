import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { css, keyframes } from 'styled-components';
import { Button } from '../ui';
import { DiceIcon } from '../icons';
import { DiceRoll, DICE_MAX_VISIBLE } from '../../types/dice';

/**
 * Central "dice rolling" animation shown to every viewer of a roll. The result
 * is authoritative (from the backend) — the shuffling numbers are purely visual.
 * After a short roll it reveals the individual results and total, and stays open
 * until the viewer dismisses it (backdrop / close button).
 */
const ROLL_MS = 1200;
const SHUFFLE_MS = 80;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const shake = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-6px) rotate(-8deg); }
  50% { transform: translateY(2px) rotate(6deg); }
  75% { transform: translateY(-3px) rotate(-4deg); }
`;
const pop = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.12); }
  100% { transform: scale(1); opacity: 1; }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 72%, transparent);
  animation: ${fadeIn} 160ms ease-out;
`;
const Panel = styled.div`
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  text-align: center;
`;
const Title = styled.h3`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
`;
const SecretTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
  color: ${({ theme }) => theme.colors.primary};
`;
const DiceGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Die = styled.div<{ $rolling: boolean }>`
  position: relative;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  ${({ $rolling }) =>
    $rolling
      ? css`
          animation: ${shake} 0.42s ease-in-out infinite;
        `
      : css`
          animation: ${pop} 0.32s ease-out both;
        `}
`;
const More = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0 ${({ theme }) => theme.spacing.xs};
`;
const Total = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.primary};
`;
const Summary = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  overflow-wrap: anywhere;
`;
const Roller = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface Props {
  roll: DiceRoll;
  onClose: () => void;
}

export function DiceRollOverlay({ roll, onClose }: Props) {
  const { t } = useTranslation();
  const visibleCount = Math.min(roll.quantity, DICE_MAX_VISIBLE);
  const [phase, setPhase] = useState<'rolling' | 'revealed'>('rolling');
  const [shuffle, setShuffle] = useState<number[]>(() =>
    Array.from({ length: visibleCount }, () => 1),
  );

  useEffect(() => {
    setPhase('rolling');
    const iv = window.setInterval(() => {
      setShuffle(
        Array.from(
          { length: visibleCount },
          () => Math.floor(Math.random() * roll.sides) + 1,
        ),
      );
    }, SHUFFLE_MS);
    const revealT = window.setTimeout(() => {
      window.clearInterval(iv);
      setPhase('revealed');
    }, ROLL_MS);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(revealT);
    };
  }, [roll.id, roll.sides, visibleCount]);

  const notation = `${roll.quantity}d${roll.sides}`;
  const isSecret = roll.visibility === 'SECRET';
  const rollerName = roll.rolledByName || t('session.dice.masterFallback');
  const revealed = phase === 'revealed';

  return (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true">
      <Panel onClick={(e) => e.stopPropagation()}>
        {isSecret ? (
          <SecretTag>
            <DiceIcon size={14} /> {t('session.dice.secretRoll')}
          </SecretTag>
        ) : (
          <Roller>{t('session.dice.rolledBy', { name: rollerName })}</Roller>
        )}
        <Title>{notation}</Title>

        <DiceGrid aria-hidden="true">
          {(revealed ? roll.results.slice(0, visibleCount) : shuffle).map((n, i) => (
            <Die key={i} $rolling={!revealed}>
              {revealed ? n : '?'}
            </Die>
          ))}
          {revealed && roll.quantity > visibleCount && (
            <More>+{roll.quantity - visibleCount}</More>
          )}
        </DiceGrid>

        {revealed && (
          <>
            <Total>
              {t('session.dice.total')}: {roll.total}
            </Total>
            {/* Text result — accessible and the fallback for large quantities. */}
            <Summary aria-live="polite">
              {notation}: {roll.results.join(', ')}. {t('session.dice.total')}{' '}
              {roll.total}.
            </Summary>
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('session.dice.close')}
            </Button>
          </>
        )}
      </Panel>
    </Backdrop>
  );
}
