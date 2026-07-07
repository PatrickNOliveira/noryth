import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
  Divider,
} from '../components/ui';
import { CoverUploader } from '../components/CoverUploader';
import { useAppDispatch } from '../store/hooks';
import { createCampaign } from '../store/slices/campaigns.slice';
import { useLanguage } from '../hooks/useLanguage';
import {
  CAMPAIGN_THEME_OPTIONS,
  CAMPAIGN_TONE_OPTIONS,
  CAMPAIGN_VISIBILITY_OPTIONS,
} from '../utils/campaignOptions';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages';
import { CampaignVisibility } from '../types/campaign';
import { ApiError } from '../services/api';

interface FormValues {
  name: string;
  theme: string;
  customTheme: string;
  shortDescription: string;
  premise: string;
  tone: string;
  customTone: string;
  mainLanguage: string;
  visibility: string;
  password: string;
  maxPlayers: string;
}

const Book = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxl};
`;

const Opening = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Kicker = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.body};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

const Title = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  color: ${({ theme }) => theme.colors.text};
`;

const Lead = styled.p`
  max-width: 54ch;
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-style: italic;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
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

const SummaryList = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};

  dt {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    align-self: center;
  }
  dd {
    font-family: ${({ theme }) => theme.typography.fontFamily.heading};
    color: ${({ theme }) => theme.colors.text};
    overflow-wrap: anywhere;
  }
`;

const Submit = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

export function NewCampaignPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [cover, setCover] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultLanguage = SUPPORTED_LANGUAGES.some((l) => l.code === language)
    ? language
    : 'en-US';

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      theme: '',
      customTheme: '',
      shortDescription: '',
      premise: '',
      tone: '',
      customTone: '',
      mainLanguage: defaultLanguage,
      visibility: 'private',
      password: '',
      maxPlayers: '',
    },
  });

  const theme = watch('theme');
  const tone = watch('tone');
  const watched = watch();

  const themeLabel = watched.theme
    ? watched.theme === 'custom'
      ? watched.customTheme || t('campaign.theme.custom')
      : t(`campaign.theme.${watched.theme}`)
    : '—';
  const toneLabel = watched.tone
    ? watched.tone === 'custom'
      ? watched.customTone || t('campaign.tone.custom')
      : t(`campaign.tone.${watched.tone}`)
    : '—';
  const languageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === watched.mainLanguage)?.label ?? '—';

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await dispatch(
        createCampaign({
          name: values.name.trim(),
          theme: values.theme,
          customTheme: values.theme === 'custom' ? values.customTheme.trim() : undefined,
          shortDescription: values.shortDescription.trim(),
          premise: values.premise.trim(),
          tone: values.tone,
          customTone: values.tone === 'custom' ? values.customTone.trim() : undefined,
          mainLanguage: values.mainLanguage,
          visibility: values.visibility as CampaignVisibility,
          password: values.password || undefined,
          maxPlayers: values.maxPlayers ? Number(values.maxPlayers) : undefined,
          coverImage: cover,
        }),
      ).unwrap();
      navigate(`/campaigns/${result.id}`, { replace: true });
    } catch (error) {
      setSubmitError((error as ApiError)?.message ?? t('campaign.form.error'));
    }
  });

  return (
    <Book onSubmit={onSubmit} noValidate>
      <Opening>
        <Kicker>{t('campaign.new.kicker')}</Kicker>
        <Title>{t('campaign.new.title')}</Title>
        <Lead>{t('campaign.new.lead')}</Lead>
      </Opening>

      {/* 1. Identity */}
      <Chapter>
        <ChapterHeading numeral="I" eyebrow={t('campaign.sections.identity')} title={t('campaign.sections.identityTitle')} />
        <Fields>
          <FormField label={t('campaign.fields.name')} error={errors.name?.message}>
            {(f) => (
              <Input
                {...f}
                placeholder={t('campaign.placeholders.name')}
                {...register('name', {
                  required: t('campaign.validation.nameRequired'),
                  minLength: { value: 3, message: t('campaign.validation.nameMin') },
                  maxLength: { value: 120, message: t('campaign.validation.nameMax') },
                })}
              />
            )}
          </FormField>

          <FormField label={t('campaign.fields.theme')} error={errors.theme?.message}>
            {(f) => (
              <Select {...f} defaultValue="" {...register('theme', { required: t('campaign.validation.themeRequired') })}>
                <option value="" disabled>
                  {t('campaign.form.choose')}
                </option>
                {CAMPAIGN_THEME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`campaign.theme.${opt}`)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          {theme === 'custom' && (
            <FormField label={t('campaign.fields.customTheme')} error={errors.customTheme?.message}>
              {(f) => (
                <Input
                  {...f}
                  placeholder={t('campaign.placeholders.customTheme')}
                  {...register('customTheme', {
                    validate: (v) =>
                      getValues('theme') !== 'custom' || v.trim().length > 0 || t('campaign.validation.customThemeRequired'),
                  })}
                />
              )}
            </FormField>
          )}

          <FormField label={t('campaign.fields.shortDescription')} error={errors.shortDescription?.message}>
            {(f) => (
              <Input
                {...f}
                placeholder={t('campaign.placeholders.shortDescription')}
                {...register('shortDescription', {
                  required: t('campaign.validation.shortDescriptionRequired'),
                  maxLength: { value: 280, message: t('campaign.validation.shortDescriptionMax') },
                })}
              />
            )}
          </FormField>
        </Fields>
      </Chapter>

      {/* 2. World */}
      <Chapter>
        <ChapterHeading numeral="II" eyebrow={t('campaign.sections.world')} title={t('campaign.sections.worldTitle')} />
        <Fields>
          <FormField label={t('campaign.fields.premise')} error={errors.premise?.message}>
            {(f) => (
              <Textarea
                {...f}
                placeholder={t('campaign.placeholders.premise')}
                {...register('premise', {
                  required: t('campaign.validation.premiseRequired'),
                  maxLength: { value: 10000, message: t('campaign.validation.premiseMax') },
                })}
              />
            )}
          </FormField>

          <FormField label={t('campaign.fields.tone')} error={errors.tone?.message}>
            {(f) => (
              <Select {...f} defaultValue="" {...register('tone', { required: t('campaign.validation.toneRequired') })}>
                <option value="" disabled>
                  {t('campaign.form.choose')}
                </option>
                {CAMPAIGN_TONE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`campaign.tone.${opt}`)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          {tone === 'custom' && (
            <FormField label={t('campaign.fields.customTone')} error={errors.customTone?.message}>
              {(f) => (
                <Input
                  {...f}
                  placeholder={t('campaign.placeholders.customTone')}
                  {...register('customTone', {
                    validate: (v) =>
                      getValues('tone') !== 'custom' || v.trim().length > 0 || t('campaign.validation.customToneRequired'),
                  })}
                />
              )}
            </FormField>
          )}

          <FormField label={t('campaign.fields.mainLanguage')} error={errors.mainLanguage?.message}>
            {(f) => (
              <Select {...f} {...register('mainLanguage', { required: true })}>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </Fields>
      </Chapter>

      {/* 3. Access */}
      <Chapter>
        <ChapterHeading numeral="III" eyebrow={t('campaign.sections.access')} title={t('campaign.sections.accessTitle')} />
        <Fields>
          <FormField label={t('campaign.fields.visibility')} error={errors.visibility?.message}>
            {(f) => (
              <Select {...f} {...register('visibility', { required: true })}>
                {CAMPAIGN_VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`campaign.visibility.${opt}`)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label={t('campaign.fields.password')} hint={t('campaign.hints.password')} error={errors.password?.message}>
            {(f) => (
              <Input
                {...f}
                type="password"
                autoComplete="new-password"
                placeholder={t('campaign.placeholders.password')}
                {...register('password', {
                  validate: (v) => !v || v.length >= 6 || t('campaign.validation.passwordMin'),
                })}
              />
            )}
          </FormField>

          <FormField label={t('campaign.fields.maxPlayers')} hint={t('campaign.hints.maxPlayers')} error={errors.maxPlayers?.message}>
            {(f) => (
              <Input
                {...f}
                type="number"
                min={1}
                max={50}
                placeholder={t('campaign.placeholders.maxPlayers')}
                {...register('maxPlayers', {
                  validate: (v) => {
                    if (!v) return true;
                    const n = Number(v);
                    return (Number.isInteger(n) && n >= 1 && n <= 50) || t('campaign.validation.maxPlayers');
                  },
                })}
              />
            )}
          </FormField>
        </Fields>
      </Chapter>

      {/* 4. Cover */}
      <Chapter>
        <ChapterHeading numeral="IV" eyebrow={t('campaign.sections.cover')} title={t('campaign.sections.coverTitle')} />
        <CoverUploader value={cover} onChange={setCover} />
      </Chapter>

      {/* 5. Review */}
      <Chapter>
        <ChapterHeading numeral="V" eyebrow={t('campaign.sections.review')} title={t('campaign.sections.reviewTitle')} />
        <SummaryList>
          <dt>{t('campaign.fields.name')}</dt>
          <dd>{watched.name || '—'}</dd>
          <dt>{t('campaign.fields.theme')}</dt>
          <dd>{themeLabel}</dd>
          <dt>{t('campaign.fields.tone')}</dt>
          <dd>{toneLabel}</dd>
          <dt>{t('campaign.fields.mainLanguage')}</dt>
          <dd>{languageLabel}</dd>
          <dt>{t('campaign.fields.visibility')}</dt>
          <dd>{watched.visibility ? t(`campaign.visibility.${watched.visibility}`) : '—'}</dd>
          <dt>{t('campaign.fields.cover')}</dt>
          <dd>{cover ? cover.name : t('campaign.review.noCover')}</dd>
        </SummaryList>

        <Divider variant="ornament" />

        <Submit>
          {submitError && <Alert variant="error">{submitError}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            {t('campaign.form.submit')}
          </Button>
        </Submit>
      </Chapter>
    </Book>
  );
}
