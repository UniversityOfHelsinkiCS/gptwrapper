import { Locale } from './lang'

// coded by ai-mluukkai
export function shouldRenderAsText(mimetype: string): boolean {
  // regex tekstityypeille
  const textRegex = /^text\//

  // erityistapaukset
  const specialCases = ['application/json']

  return textRegex.test(mimetype) || specialCases.includes(mimetype)
}

// Source material types the RAG ingestion pipeline can actually process:
// PDFs (parsed), PNGs (VLM), and plain text / JSON (read directly). Used as the single source of
// truth for the upload `accept` filter, frontend validation, and the backend fileFilter.
const SUPPORTED_RAG_EXTENSIONS = ['pdf', 'png', 'txt', 'md', 'markdown', 'csv', 'json']

export const RAG_FILE_ACCEPT = '.pdf,.png,.txt,.md,.markdown,.csv,.json,application/pdf,image/png,application/json,text/*'

export function isSupportedRagFileType(mimetype: string): boolean {
  return mimetype === 'application/pdf' || mimetype === 'image/png' || shouldRenderAsText(mimetype)
}

// Browsers (and multer) sometimes report an empty or generic mimetype for files like .md or .csv, so
// fall back to the filename extension before treating a file as unsupported.
export function isSupportedRagFile(filename: string, mimetype: string): boolean {
  if (mimetype && isSupportedRagFileType(mimetype)) return true
  const ext = filename.split('.').pop()?.toLowerCase()
  return !!ext && SUPPORTED_RAG_EXTENSIONS.includes(ext)
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
