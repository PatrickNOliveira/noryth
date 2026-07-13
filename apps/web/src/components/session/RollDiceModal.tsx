import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Modal, Button, Input, Select } from '../ui';
import {
  DICE_TYPES,
  DICE_QUANTITY_MAX,
  DICE_QUANTITY_MIN,
  DiceType,
  DiceVisibility,
  RollDiceInput,
} from '../../types/dice';

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;
const FieldLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;
/** Two-option segmented control for visibility. */
const Segmented = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Segment = styled.button<{ $active: boolean }>`
  flex: 1 1 0;
  min-height: 44px;
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surfaceAlt : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  onRoll: (input: RollDiceInput) => void;
}

export function RollDiceModal({ isOpen, onClose, loading, onRoll }: Props) {
  const { t } = useTranslation();
  const [diceType, setDiceType] = useState<DiceType>('D20');
  const [quantity, setQuantity] = useState(1);
  const [visibility, setVisibility] = useState<DiceVisibility>('PUBLIC');

  const clampQty = (n: number) =>
    Math.min(DICE_QUANTITY_MAX, Math.max(DICE_QUANTITY_MIN, Math.floor(n) || 1));

  const submit = () => {
    if (loading) return;
    onRoll({ diceType, quantity: clampQty(quantity), visibility });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('session.dice.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('session.dice.cancel')}
          </Button>
          <Button onClick={submit} loading={loading}>
            {t('session.dice.roll')}
          </Button>
        </>
      }
    >
      <Field>
        <FieldLabel>{t('session.dice.die')}</FieldLabel>
        <Select
          value={diceType}
          onChange={(e) => setDiceType(e.target.value as DiceType)}
        >
          {DICE_TYPES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <FieldLabel>{t('session.dice.quantity')}</FieldLabel>
        <Input
          type="number"
          min={DICE_QUANTITY_MIN}
          max={DICE_QUANTITY_MAX}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          onBlur={() => setQuantity((q) => clampQty(q))}
        />
        <Hint>
          {t('session.dice.quantityHint', {
            min: DICE_QUANTITY_MIN,
            max: DICE_QUANTITY_MAX,
          })}
        </Hint>
      </Field>

      <Field as="div">
        <FieldLabel>{t('session.dice.visibility')}</FieldLabel>
        <Segmented>
          <Segment
            type="button"
            $active={visibility === 'PUBLIC'}
            onClick={() => setVisibility('PUBLIC')}
          >
            {t('session.dice.public')}
          </Segment>
          <Segment
            type="button"
            $active={visibility === 'SECRET'}
            onClick={() => setVisibility('SECRET')}
          >
            {t('session.dice.secret')}
          </Segment>
        </Segmented>
      </Field>
    </Modal>
  );
}
