import { Locale } from './types'

// coded by ai-mluukkai
export function shouldRenderAsText(mimetype: string): boolean {
  // regex tekstityypeille
  const textRegex = /^text\//

  // erityistapaukset
  const specialCases = ['application/json']

  return textRegex.test(mimetype) || specialCases.includes(mimetype)
}

export const getLanguageValue = (locale: Locale, language: keyof Locale | string) => {
  const translation = locale[language]
  return translation || locale['en'] || locale['fi']
}
