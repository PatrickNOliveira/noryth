import React, { useId } from 'react';
import styled from 'styled-components';

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxs};
  width: 100%;
`;

const LabelRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xxs};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textMuted};
  letter-spacing: ${({ theme }) => theme.typography.letterSpacing.widest};
  text-transform: uppercase;
`;

const Required = styled.span`
  color: ${({ theme }) => theme.colors.accent};
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.danger};
  min-height: 1em;
`;

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Render-prop receives the id to wire label→control accessibility. */
  children: (props: { id: string; 'aria-invalid': boolean }) => React.ReactNode;
  className?: string;
}

/**
 * Wraps any control (Input, Textarea, Select…) with a label, optional hint and
 * a reserved error slot (so validation never shifts the layout). Owns the
 * accessibility wiring via a generated id.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  const id = useId();
  return (
    <Field className={className}>
      {label && (
        <LabelRow htmlFor={id}>
          {label}
          {required && <Required aria-hidden="true">✦</Required>}
        </LabelRow>
      )}
      {children({ id, 'aria-invalid': !!error })}
      {error ? <ErrorText>{error}</ErrorText> : hint ? <Hint>{hint}</Hint> : <ErrorText />}
    </Field>
  );
}
