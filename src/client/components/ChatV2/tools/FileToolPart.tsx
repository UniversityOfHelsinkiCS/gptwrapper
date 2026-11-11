import FolderOutlined from '@mui/icons-material/FolderOutlined'
import { useTranslation } from 'react-i18next'
import type { ToolPart } from '../../../../shared/agentChat'
import type { FileToolSummary } from '../../../../shared/fileTools'
import { ToolPartRow } from './ToolPartRow'

const str = (value: unknown) => (typeof value === 'string' ? value : '')

const inputOf = (part: ToolPart) => (part.input && typeof part.input === 'object' ? (part.input as Record<string, unknown>) : {})

const readSummary = (part: ToolPart): Extract<FileToolSummary, { tool: 'read_file' }> | null => {
  const result = part.result as Partial<FileToolSummary> | undefined
  return part.status === 'ok' && result?.tool === 'read_file' ? (result as Extract<FileToolSummary, { tool: 'read_file' }>) : null
}

/** A My files tool call (`ls`, `read_file`, `glob`, `grep`) in its place in the answer: what the agent looked at. */
export const FileToolPart = ({ part }: { part: ToolPart }) => {
  const { t } = useTranslation()
  const input = inputOf(part)
  const params = { interpolation: { escapeValue: false } }
  const pathOrRoot = (path: string) => path || t('myFiles:title')

  const action = (() => {
    switch (part.name) {
      case 'ls':
        return t('chat:fileToolLs', { ...params, path: pathOrRoot(str(input.path)) })
      case 'read_file': {
        const summary = readSummary(part)
        return summary && summary.totalLines > 0
          ? t('chat:fileToolReadFileLines', { ...params, path: summary.path, start: summary.startLine, end: summary.endLine, total: summary.totalLines })
          : t('chat:fileToolReadFile', { ...params, path: str(input.path) })
      }
      case 'glob':
        return t('chat:fileToolGlob', { ...params, pattern: str(input.pattern) })
      default:
        return t('chat:fileToolGrep', { ...params, pattern: str(input.pattern), path: pathOrRoot(str(input.path)) })
    }
  })()

  const text = part.status === 'error' ? t('chat:fileToolFailed', { ...params, action }) : part.status === 'running' ? `${action}…` : action
  return <ToolPartRow part={part} label={t('myFiles:title')} icon={<FolderOutlined fontSize="small" />} text={text} />
}
