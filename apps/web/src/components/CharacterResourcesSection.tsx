import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  Alert,
  Badge,
  Button,
  ChapterHeading,
  EmptyState,
  Input,
  Loading,
  useToast,
} from './ui';
import { DiceIcon } from './icons';
import { resourceService } from '../services/resource.service';
import { CharacterResource } from '../types/resource';
import { media } from '../styles/media';

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;
const Rows = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;
const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  ${media.tablet} {
    flex-direction: row;
    align-items: center;
  }
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: 0;
`;
const Name = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
`;
const Value = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;
const Editor = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;
const Small = styled.div`
  width: 72px;
`;
const Sep = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;

interface Draft {
  current: string;
  max: string;
}

interface Props {
  campaignId: string;
  characterId: string;
  canManage?: boolean;
}

/**
 * "Recursos" on the character sheet: shows each resource's EFFECTIVE current/max
 * (honoring the active form's overrides). The master can edit the base current
 * and base max; a form override is flagged. Read-only for non-masters.
 */
export function CharacterResourcesSection({
  campaignId,
  characterId,
  canManage = false,
}: Props) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [list, setList] = useState<CharacterResource[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const applyList = (rows: CharacterResource[]) => {
    setList(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((r) => [
          r.resourceDefinitionId,
          { current: String(r.currentValue), max: String(r.baseMaxValue) },
        ]),
      ),
    );
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    resourceService
      .listForCharacter(campaignId, characterId)
      .then((rows) => !cancelled && applyList(rows))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [campaignId, characterId]);

  const dirty = useMemo(() => {
    if (!list) return false;
    return list.some((r) => {
      const d = drafts[r.resourceDefinitionId];
      return d && (Number(d.current) !== r.currentValue || Number(d.max) !== r.baseMaxValue);
    });
  }, [list, drafts]);

  const valid = useMemo(() => {
    if (!list) return false;
    return list.every((r) => {
      const d = drafts[r.resourceDefinitionId];
      if (!d) return true;
      const cur = Number(d.current);
      const max = Number(d.max);
      return (
        d.current !== '' &&
        d.max !== '' &&
        Number.isInteger(cur) &&
        Number.isInteger(max) &&
        max >= r.minValue &&
        cur >= r.minValue
      );
    });
  }, [list, drafts]);

  const save = () => {
    if (!list || !valid || saving) return;
    setSaving(true);
    resourceService
      .updateForCharacter(
        campaignId,
        characterId,
        list.map((r) => {
          const d = drafts[r.resourceDefinitionId];
          return {
            resourceDefinitionId: r.resourceDefinitionId,
            currentValue: Number(d.current),
            maxValue: Number(d.max),
          };
        }),
      )
      .then((rows) => {
        applyList(rows);
        notify(t('character.resources.saved'), { variant: 'success' });
      })
      .catch(() => notify(t('character.resources.saveError'), { variant: 'error' }))
      .finally(() => setSaving(false));
  };

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <Section>
      <ChapterHeading eyebrow={t('character.resources.eyebrow')} title={t('character.resources.title')} />
      {error ? (
        <Alert variant="error">{t('character.resources.loadError')}</Alert>
      ) : loading && !list ? (
        <Loading block label={t('character.resources.loading')} />
      ) : list && list.length === 0 ? (
        <EmptyState
          icon={<DiceIcon size={36} />}
          title={t('character.resources.emptyTitle')}
          description={t('character.resources.emptyDescription')}
        />
      ) : (
        <>
          <Rows>
            {list?.map((r) => (
              <Row key={r.resourceDefinitionId}>
                <Head>
                  <Name>{r.name}</Name>
                  <Value>
                    {r.effectiveCurrentValue} / {r.effectiveMaxValue}
                  </Value>
                  {r.isOverriddenByActiveForm && (
                    <Badge $tone="accent">{t('character.resources.fromForm')}</Badge>
                  )}
                  {!r.isVisibleToPlayers && (
                    <Badge $tone="neutral">{t('character.resources.hidden')}</Badge>
                  )}
                </Head>
                {canManage && (
                  <Editor>
                    <Small>
                      <Input
                        type="number"
                        inputMode="numeric"
                        aria-label={t('character.resources.current')}
                        value={drafts[r.resourceDefinitionId]?.current ?? ''}
                        onChange={(e) => setDraft(r.resourceDefinitionId, { current: e.target.value })}
                      />
                    </Small>
                    <Sep>/</Sep>
                    <Small>
                      <Input
                        type="number"
                        inputMode="numeric"
                        aria-label={t('character.resources.max')}
                        value={drafts[r.resourceDefinitionId]?.max ?? ''}
                        onChange={(e) => setDraft(r.resourceDefinitionId, { max: e.target.value })}
                      />
                    </Small>
                  </Editor>
                )}
              </Row>
            ))}
          </Rows>
          {canManage && (
            <div>
              <Button variant="primary" loading={saving} disabled={!dirty || !valid} onClick={save}>
                {t('character.resources.save')}
              </Button>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
