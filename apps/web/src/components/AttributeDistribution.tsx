import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Alert, Badge, Button, Input } from './ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAttributes } from '../store/slices/campaignAttributes.slice';
import { distributeMyAttributes } from '../store/slices/characters.slice';
import { Character } from '../types/character';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;
const Totals = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Rows = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Row = styled.li`
  display: grid;
  grid-template-columns: 1fr auto 90px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
`;
const AName = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  color: ${({ theme }) => theme.colors.text};
`;
const Range = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface Props {
  campaignId: string;
  character: Character;
}

export function AttributeDistribution({ campaignId, character }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const attributes = useAppSelector((s) => s.campaignAttributes.list);
  const saving = useAppSelector((s) => s.characters.saving);
  const budget = character.attributePointsBudget;

  useEffect(() => {
    dispatch(fetchAttributes(campaignId));
  }, [campaignId, dispatch]);

  // attributeId → raw value string, seeded from the character (else the minimum).
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const existing = new Map(character.attributes.map((a) => [a.attributeId, a.value]));
    const seed: Record<string, string> = {};
    for (const attr of attributes) {
      const v = existing.get(attr.id);
      seed[attr.id] = String(v ?? attr.minValue);
    }
    setValues(seed);
  }, [attributes, character.attributes]);

  const parsed = useMemo(
    () =>
      attributes.map((attr) => {
        const raw = values[attr.id];
        const n = raw === undefined || raw === '' ? attr.minValue : Number(raw);
        const valid =
          Number.isInteger(n) && n >= attr.minValue && n <= attr.maxValue;
        const spent = valid ? n - attr.minValue : 0;
        return { attr, n, valid, spent };
      }),
    [attributes, values],
  );

  const spent = parsed.reduce((s, p) => s + p.spent, 0);
  const remaining = budget != null ? budget - spent : 0;
  const allValid = parsed.every((p) => p.valid);
  const overBudget = budget != null && spent > budget;
  const canSave = budget != null && allValid && !overBudget && !saving;

  const save = () => {
    if (!canSave) return;
    dispatch(
      distributeMyAttributes({
        campaignId,
        characterId: character.id,
        attributes: parsed.map((p) => ({ attributeId: p.attr.id, value: p.n })),
      }),
    );
  };

  if (attributes.length === 0) {
    return <Alert variant="info">{t('playerCharacter.attributes.noAttributes')}</Alert>;
  }

  if (budget == null) {
    return <Alert variant="warning">{t('playerCharacter.attributes.noBudget')}</Alert>;
  }

  return (
    <Wrap>
      <Totals>
        <Badge $tone="info">{t('playerCharacter.attributes.available', { count: budget })}</Badge>
        <Badge $tone="neutral">{t('playerCharacter.attributes.spent', { count: spent })}</Badge>
        <Badge $tone={remaining < 0 ? 'danger' : 'success'}>
          {t('playerCharacter.attributes.remaining', { count: remaining })}
        </Badge>
      </Totals>

      {overBudget && <Alert variant="error">{t('playerCharacter.attributes.over')}</Alert>}

      <Rows>
        {parsed.map(({ attr, valid, spent: s }) => (
          <Row key={attr.id}>
            <AName>{attr.name}</AName>
            <Range>
              {attr.minValue}–{attr.maxValue} · {t('playerCharacter.attributes.cost', { count: s })}
            </Range>
            <Input
              type="number"
              inputMode="numeric"
              aria-invalid={!valid}
              value={values[attr.id] ?? ''}
              min={attr.minValue}
              max={attr.maxValue}
              onChange={(e) => setValues((prev) => ({ ...prev, [attr.id]: e.target.value }))}
            />
          </Row>
        ))}
      </Rows>

      <div>
        <Button loading={saving} disabled={!canSave} onClick={save}>
          {t('playerCharacter.attributes.save')}
        </Button>
      </div>
    </Wrap>
  );
}
