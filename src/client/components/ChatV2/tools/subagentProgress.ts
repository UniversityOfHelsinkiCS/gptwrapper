import type { TFunction } from 'i18next'
import type { SubagentPart } from '../../../../shared/agentChat'
import { isReadPdfProgress, READ_PDF } from '../../../../shared/readPdf'

const readPdfProgressText = (progress: unknown, t: TFunction): string | null => {
  if (!isReadPdfProgress(progress)) return null
  const params = { interpolation: { escapeValue: false } }
  if (progress.action === 'search') return t('chat:readPdfSearching', { ...params, path: progress.path, pattern: progress.pattern })
  const { startPage, endPage, totalPages } = progress
  if (startPage === undefined || endPage === undefined) return t('chat:readPdfReadingFile', { ...params, path: progress.path })
  return totalPages === undefined
    ? t('chat:readPdfReadingPagesNoTotal', { ...params, start: startPage, end: endPage })
    : t('chat:readPdfReadingPages', { ...params, start: startPage, end: endPage, total: totalPages })
}

/** How the subagents that report progress show it on their card, by tool name. */
const progressRenderers: Record<string, (progress: unknown, t: TFunction) => string | null> = {
  [READ_PDF]: readPdfProgressText,
}

/** The progress line of a running subagent's card, or null when it has none. */
export const subagentProgressText = (part: SubagentPart, t: TFunction): string | null =>
  part.status === 'running' && part.progress !== undefined ? progressRenderers[part.name]?.(part.progress, t) ?? null : null
