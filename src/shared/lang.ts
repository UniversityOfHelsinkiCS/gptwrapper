import z from 'zod/v4'

export const LANGUAGES = ['fi', 'sv', 'en'] as const

export const LanguageSchema = z.enum(LANGUAGES)

export type Locale = Record<(typeof LANGUAGES)[number], string>
