import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  ChapterHeading,
  Button,
  Input,
  Textarea,
  Select,
  FormField,
  Alert,
} from '../components/ui';
import { useAppDispatch } from '../store/hooks';
import { createFaction } from '../store/slices/factions.slice';
import { FACTION_TYPE_OPTIONS, FACTION_SYMBOL_TYPE_OPTIONS } from '../utils/factionOptions';
import { FactionSymbolType } from '../types/faction';
import { ApiError } from '../services/api';

interface FormValues {
  name: string;
  type: string;
  customType: string;
  description: string;
  history: string;
  identity: string;
  memberTraits: string;
  values: string;
  motto: string;
  colors: string;
  recurringElements: string;
  symbolType: string;
  symbolPrompt: string;
}

const Book = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxl};
`;

const BackRow = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Chapter = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Submit = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

export function NewFactionPage() {
  const { t } = useTranslation();
  const { campaignId = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      type: '',
      customType: '',
      description: '',
      history: '',
      identity: '',
      memberTraits: '',
      values: '',
      motto: '',
      colors: '',
      recurringElements: '',
      symbolType: 'coat_of_arms',
      symbolPrompt: '',
    },
  });

  const type = watch('type');

  const onSubmit = handleSubmit(async (v) => {
    setSubmitError(null);
    try {
      const faction = await dispatch(
        createFaction({
          campaignId,
          input: {
            name: v.name.trim(),
            type: v.type,
            customType: v.type === 'custom' ? v.customType.trim() : undefined,
            description: v.description.trim() || undefined,
            history: v.history.trim() || undefined,
            identity: v.identity.trim() || undefined,
            memberTraits: v.memberTraits.trim() || undefined,
            values: v.values.trim() || undefined,
            motto: v.motto.trim() || undefined,
            colors: v.colors.trim() || undefined,
            recurringElements: v.recurringElements.trim() || undefined,
            symbolType: v.symbolType as FactionSymbolType,
            symbolPrompt: v.symbolPrompt.trim() || undefined,
          },
        }),
      ).unwrap();
      navigate(`/campaigns/${campaignId}/factions/${faction.id}`, { replace: true });
    } catch (error) {
      setSubmitError((error as ApiError)?.message ?? t('faction.new.error'));
    }
  });

  return (
    <Book onSubmit={onSubmit} noValidate>
      <BackRow>
        <Button variant="ghost" size="sm" type="button" onClick={() => navigate(`/campaigns/${campaignId}/factions`)}>
          {t('faction.new.back')}
        </Button>
      </BackRow>

      <ChapterHeading eyebrow={t('faction.new.eyebrow')} title={t('faction.new.title')} lead={t('faction.new.lead')} />

      <Chapter>
        <ChapterHeading numeral="I" eyebrow={t('faction.sections.identity')} title={t('faction.sections.identityTitle')} />
        <Fields>
          <FormField label={t('faction.fields.name')} error={errors.name?.message}>
            {(f) => (
              <Input {...f} placeholder={t('faction.placeholders.name')} {...register('name', {
                required: t('faction.validation.nameRequired'),
                minLength: { value: 3, message: t('faction.validation.nameMin') },
              })} />
            )}
          </FormField>
          <FormField label={t('faction.fields.type')} error={errors.type?.message}>
            {(f) => (
              <Select {...f} defaultValue="" {...register('type', { required: t('faction.validation.typeRequired') })}>
                <option value="" disabled>{t('faction.form.choose')}</option>
                {FACTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{t(`faction.type.${opt}`)}</option>
                ))}
              </Select>
            )}
          </FormField>
          {type === 'custom' && (
            <FormField label={t('faction.fields.customType')}>
              {(f) => <Input {...f} placeholder={t('faction.placeholders.customType')} {...register('customType')} />}
            </FormField>
          )}
          <FormField label={t('faction.fields.description')} hint={t('faction.hints.description')}>
            {(f) => <Input {...f} placeholder={t('faction.placeholders.description')} {...register('description')} />}
          </FormField>
        </Fields>
      </Chapter>

      <Chapter>
        <ChapterHeading numeral="II" eyebrow={t('faction.sections.lore')} title={t('faction.sections.loreTitle')} />
        <Fields>
          <FormField label={t('faction.fields.history')}>
            {(f) => <Textarea {...f} placeholder={t('faction.placeholders.history')} {...register('history')} />}
          </FormField>
          <FormField label={t('faction.fields.identity')} hint={t('faction.hints.identity')}>
            {(f) => <Textarea {...f} placeholder={t('faction.placeholders.identity')} {...register('identity')} />}
          </FormField>
          <FormField label={t('faction.fields.memberTraits')} hint={t('faction.hints.memberTraits')}>
            {(f) => <Textarea {...f} placeholder={t('faction.placeholders.memberTraits')} {...register('memberTraits')} />}
          </FormField>
          <FormField label={t('faction.fields.values')}>
            {(f) => <Input {...f} placeholder={t('faction.placeholders.values')} {...register('values')} />}
          </FormField>
          <FormField label={t('faction.fields.motto')}>
            {(f) => <Input {...f} placeholder={t('faction.placeholders.motto')} {...register('motto')} />}
          </FormField>
          <FormField label={t('faction.fields.colors')}>
            {(f) => <Input {...f} placeholder={t('faction.placeholders.colors')} {...register('colors')} />}
          </FormField>
          <FormField label={t('faction.fields.recurringElements')} hint={t('faction.hints.recurringElements')}>
            {(f) => <Input {...f} placeholder={t('faction.placeholders.recurringElements')} {...register('recurringElements')} />}
          </FormField>
        </Fields>
      </Chapter>

      <Chapter>
        <ChapterHeading numeral="III" eyebrow={t('faction.sections.symbol')} title={t('faction.sections.symbolTitle')} />
        <Fields>
          <FormField label={t('faction.fields.symbolType')} error={errors.symbolType?.message}>
            {(f) => (
              <Select {...f} {...register('symbolType', { required: true })}>
                {FACTION_SYMBOL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{t(`faction.symbolType.${opt}`)}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label={t('faction.fields.symbolPrompt')} hint={t('faction.hints.symbolPrompt')}>
            {(f) => <Textarea {...f} placeholder={t('faction.placeholders.symbolPrompt')} {...register('symbolPrompt')} />}
          </FormField>
        </Fields>
      </Chapter>

      <Submit>
        {submitError && <Alert variant="error">{submitError}</Alert>}
        <Alert variant="info">{t('faction.new.generationNote')}</Alert>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {t('faction.new.submit')}
        </Button>
      </Submit>
    </Book>
  );
}
