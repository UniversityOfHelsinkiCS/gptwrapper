import Build from '@mui/icons-material/Build'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssistantPart, ToolPart } from '../../../../shared/agentChat'
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
  /** The part is content of the answer (a quiz), not activity, so it is never folded into an activity group. */
  isContent?: boolean
}

const documentSearchRenderer: ToolRenderer = { Part: DocumentSearchPart, toSource: documentSearchSource }

const toolRenderers: Record<string, ToolRenderer> = {
  document_search: documentSearchRenderer,
  // Saved by v3 with the mock model
  mock_document_search: documentSearchRenderer,
  present_quiz: { Part: QuizPart, isContent: true },
  // The My files tools, run in the browser
  ls: { Part: FileToolPart },
  read_file: { Part: FileToolPart },
  glob: { Part: FileToolPart },
  grep: { Part: FileToolPart },
  write_file: { Part: FileToolPart },
  edit_file: { Part: FileToolPart },
  delete_file: { Part: FileToolPart },
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

/** Whether a part is activity (tool calls, subagents, reasoning) that can be folded into an activity group. */
export const isActivityPart = (part: AssistantPart) =>
  part.type === 'reasoning' || part.type === 'subagent' || (part.type === 'tool' && !toolRenderers[part.name]?.isContent)

export const toolPartSource = (part: ToolPart): ToolCallResultEvent | null => toolRenderers[part.name]?.toSource?.(part) ?? null
