import Search from '@mui/icons-material/Search'
import { useTranslation } from 'react-i18next'
import type { ToolPart } from '../../../../shared/agentChat'
import type { ToolCallInput, ToolCallResult, ToolCallResultEvent } from '../../../../shared/chat'
import { ToolPartRow } from './ToolPartRow'

const queryOf = (part: ToolPart): string => {
  const query = (part.input as ToolCallInput | undefined)?.query
  return typeof query === 'string' ? query : ''
}

const hasFileList = (result: unknown): result is ToolCallResult =>
  typeof result === 'object' && result !== null && Array.isArray((result as ToolCallResult).files)

/** A finished search as a source for the Sources button and side panel (the old `ToolCallResultEvent` shape). */
export const documentSearchSource = (part: ToolPart): ToolCallResultEvent | null =>
  part.input && hasFileList(part.result)
    ? { type: 'toolCallStatus', callId: part.callId, toolName: part.name, text: '', input: part.input as ToolCallInput, result: part.result }
    : null

const textKey = (part: ToolPart) => {
  if (part.status === 'running') return 'chat:documentSearchRunning'
  if (part.status === 'error') return 'chat:documentSearchFailed'
  return hasFileList(part.result) && part.result.files.length > 0 ? 'chat:documentSearchDone' : 'chat:documentSearchEmpty'
}

/** The search in its place in the answer. The results themselves are in the Sources panel. */
export const DocumentSearchPart = ({ part }: { part: ToolPart }) => {
  const { t } = useTranslation()
  return (
    <ToolPartRow
      part={part}
      label={t('chat:documentSearchTool')}
      icon={<Search fontSize="small" />}
      text={t(textKey(part), { query: queryOf(part), interpolation: { escapeValue: false } })}
    />
  )
}
