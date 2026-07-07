import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { AuthLayout } from '../layouts/AuthLayout';
import { Card, Button, Input, FormField, Alert } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { createRegisterSchema, RegisterFormValues } from '../utils/validation';
import { ApiError } from '../services/api';

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontFamily.heading};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Footer = styled.p`
  margin-top: ${({ theme }) => theme.spacing.md};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    transition: color ${({ theme }) => theme.transitions.fast};
  }
  a:hover {
    color: ${({ theme }) => theme.colors.primaryHover};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

export function RegisterPage() {
  const { t } = useTranslation();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = useMemo(() => createRegisterSchema((k) => t(k)), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setSubmitError((error as ApiError).message ?? t('auth.register.error'));
    }
  });

  return (
    <AuthLayout>
      <Card>
        <Header>
          <Title>{t('auth.register.title')}</Title>
          <Subtitle>{t('auth.register.subtitle')}</Subtitle>
        </Header>
        <Form onSubmit={onSubmit} noValidate>
          {submitError && <Alert variant="error">{submitError}</Alert>}
          <FormField label={t('auth.fields.name')} error={errors.name?.message}>
            {(field) => (
              <Input
                {...field}
                type="text"
                autoComplete="name"
                placeholder={t('auth.placeholders.name')}
                {...register('name')}
              />
            )}
          </FormField>
          <FormField label={t('auth.fields.email')} error={errors.email?.message}>
            {(field) => (
              <Input
                {...field}
                type="email"
                autoComplete="email"
                placeholder={t('auth.placeholders.email')}
                {...register('email')}
              />
            )}
          </FormField>
          <FormField label={t('auth.fields.password')} error={errors.password?.message}>
            {(field) => (
              <Input
                {...field}
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.placeholders.passwordNew')}
                {...register('password')}
              />
            )}
          </FormField>
          <Button type="submit" fullWidth loading={isSubmitting}>
            {t('auth.register.submit')}
          </Button>
        </Form>
        <Footer>
          {t('auth.register.haveAccount')} <Link to="/login">{t('auth.register.loginLink')}</Link>
        </Footer>
      </Card>
    </AuthLayout>
  );
}
