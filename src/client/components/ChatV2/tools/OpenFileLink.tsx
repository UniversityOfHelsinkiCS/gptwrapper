import { Link, type SxProps, type Theme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { SubagentPart, ToolPart } from '../../../../shared/agentChat'
import type { FileToolSummary } from '../../../../shared/fileTools'
import { isReadPdfProgress, READ_PDF } from '../../../../shared/readPdf'
import { AGENT_NOTES_FOLDER, baseName, isWithin, OUTPUTS_FOLDER } from '../../../util/myFiles/paths'
import type { ViewerTarget } from '../../FileViewer/FileViewerContext'
import { useOpenableFile } from '../../FileViewer/useOpenableFile'

const stringField = (value: unknown, key: string): string | undefined => {
  const field = value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined
  return typeof field === 'string' && field.length > 0 ? field : undefined
}

/** The first page of a `read_file` `pages` input ("3" or "3-5"). */
const firstPage = (pages: string | undefined): number | undefined => {
  const page = pages ? Number.parseInt(pages, 10) : Number.NaN
  return Number.isInteger(page) && page > 0 ? page : undefined
}

const isAgentFile = (path: string) => {
  try {
    return (isWithin(path, OUTPUTS_FOLDER) && path !== OUTPUTS_FOLDER) || (isWithin(path, AGENT_NOTES_FOLDER) && path !== AGENT_NOTES_FOLDER)
  } catch {
    return false
  }
}

/**
 * The file a finished My files tool step can open in the viewer: what `read_file` read (at its first page for a PDF),
 * or what `write_file` / `edit_file` wrote in `Outputs/` or `Agent notes/`. Null for other tools and failed or running
 * steps. Whether the viewer can show the file, and whether it is still there, is checked where it is shown.
 */
export const toolFileToOpen = (part: ToolPart): ViewerTarget | null => {
  if (part.status !== 'ok') return null
  const summary = part.result as Partial<FileToolSummary> | undefined
  const path = stringField(summary, 'path') ?? stringField(part.input, 'path')
  if (!path) return null
  if (part.name === 'read_file') {
    const page = summary && 'startPage' in summary && typeof summary.startPage === 'number' ? summary.startPage : firstPage(stringField(part.input, 'pages'))
    return page ? { path, page } : { path }
  }
  if (part.name === 'write_file' || part.name === 'edit_file') return isAgentFile(path) ? { path } : null
  return null
}

/**
 * The PDF a `read_pdf` subagent reads. Its call names no page and the card is not given its input, so the path comes
 * from its progress while it runs, or from its reader's own tool steps (which have links at their pages).
 */
export const readPdfFileOf = (part: SubagentPart): ViewerTarget | null => {
  if (part.name !== READ_PDF) return null
  if (isReadPdfProgress(part.progress)) return { path: part.progress.path }
  const path = part.parts
    .flatMap((nested) => (nested.type === 'tool' ? [stringField(nested.input, 'path')] : []))
    .find((candidate) => candidate?.toLowerCase().endsWith('.pdf'))
  return path ? { path } : null
}

/** "Open <name>": opens `target` in the viewer. Nothing when the viewer is not available here, cannot show the file, or it is gone. */
export const OpenFileLink = ({ target, sx }: { target: ViewerTarget | null; sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()
  const open = useOpenableFile(target?.path)
  if (!open || !target) return null
  return (
    <Link
      component="button"
      type="button"
      variant="body2"
      // The text color: the primary color is too faint on the dimmed tool steps.
      color="inherit"
      // A new target each time, so opening the file again jumps back to this page.
      onClick={() => open({ ...target })}
      data-testid="open-file-link"
      data-path={target.path}
      sx={[{ textAlign: 'left', verticalAlign: 'baseline', flexShrink: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {t('myFiles:openNamed', { name: baseName(target.path), interpolation: { escapeValue: false } })}
    </Link>
  )
}
