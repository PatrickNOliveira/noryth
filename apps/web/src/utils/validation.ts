import { z } from 'zod';

/**
 * Zod schema factories. Messages are provided by a translate function so
 * validation errors are localized. Build them with the current `t` (see the
 * auth pages) — schemas rebuild when the language changes.
 */
type Translate = (key: string) => string;

export const createLoginSchema = (t: Translate) =>
  z.object({
    email: z
      .string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });

export const createRegisterSchema = (t: Translate) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    email: z
      .string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z.string().min(8, t('validation.passwordMin')),
  });

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
