import z from 'zod/v4'

export const LANGUAGES = ['fi', 'sv', 'en'] as const

export const LANGUAGE_TRANSLATION_KEYS = {
  'fi': 'finnish',
  'sv': 'swedish',
  'en': 'english'
}

export const RAG_LANGUAGES = ['Finnish', 'Swedish', 'English'] as const

export const LanguageSchema = z.enum(LANGUAGES)

export const LocaleSchema = z.object({
  fi: z.string().optional().default(''),
  sv: z.string().optional().default(''),
  en: z.string().optional().default(''),
})

export type Locale = Record<(typeof LANGUAGES)[number], string>
