import Build from '@mui/icons-material/Build'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import type { ToolPart } from '../../../../shared/agentChat'
import type { ToolCallResultEvent } from '../../../../shared/chat'
import { DocumentSearchPart, documentSearchSource } from './DocumentSearchPart'
import { FileToolPart } from './FileToolPart'
import { QuizPart } from './QuizCard'
import { ToolPartRow } from './ToolPartRow'

/** How the client shows the parts of one tool. Matches the server's tool registry (`services/agent/tools/registry.ts`) by name. */
export type ToolRenderer = {
  /** The part in its place in the answer. */
  Part: ComponentType<{ part: ToolPart }>
  /** The part as a source for the Sources button and side panel, or null when it is not one. */
  toSource?: (part: ToolPart) => ToolCallResultEvent | null
}

const documentSearchRenderer: ToolRenderer = { Part: DocumentSearchPart, toSource: documentSearchSource }

const toolRenderers: Record<string, ToolRenderer> = {
  document_search: documentSearchRenderer,
  // Saved by v3 with the mock model
  mock_document_search: documentSearchRenderer,
  present_quiz: { Part: QuizPart },
  // The My files tools, run in the browser
  ls: { Part: FileToolPart },
  read_file: { Part: FileToolPart },
  glob: { Part: FileToolPart },
  grep: { Part: FileToolPart },
}

/** Shown for tools that have no renderer of their own. */
const GenericToolPart = ({ part }: { part: ToolPart }) => {
  const { t } = useTranslation()
  const key = part.status === 'running' ? 'chat:toolCallRunning' : part.status === 'error' ? 'chat:toolCallFailed' : 'chat:toolCallDone'
  const params = { name: part.name, interpolation: { escapeValue: false } }
  return <ToolPartRow part={part} label={t('chat:toolCallTool', params)} icon={<Build fontSize="small" />} text={t(key, params)} />
}

export const ToolPartView = ({ part }: { part: ToolPart }) => {
  const Part = toolRenderers[part.name]?.Part ?? GenericToolPart
  return <Part part={part} />
}

export const toolPartSource = (part: ToolPart): ToolCallResultEvent | null => toolRenderers[part.name]?.toSource?.(part) ?? null
