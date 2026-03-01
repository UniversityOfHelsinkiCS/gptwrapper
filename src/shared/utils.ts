import { Locale } from './lang'

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
  const str = translation || locale['en'] || locale['fi']
  if (typeof str !== 'string') {
    console.error('Invalid locale: ', locale)
    return '(invalid locale)'
  }
  return str
}
