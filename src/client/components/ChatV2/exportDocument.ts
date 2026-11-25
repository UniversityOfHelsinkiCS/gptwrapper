import type { TFunction } from 'i18next'
import type { PhrasingContent, Root } from 'mdast'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { type ClientChatMessage, messageToolResults, messageToText } from './messages'

/**
 * A conversation as a format-neutral document, shared by the .docx and PDF exports so that both keep the same
 * structure: the title is the only level 1 heading, every message is a level 2 heading and the markdown of a
 * message is parsed into a real tree (headings, lists, tables, links…) instead of being handled line by line.
 */
export type ExportDocument = {
  title: string
  lang: string
  sections: ExportSection[]
}

export type ExportSection = {
  heading: string
  role: ClientChatMessage['role']
  content: Root
  /** Attachments, errors and sources, shown after the content */
  notes: string[]
}

const LANGUAGE_TAGS: Record<string, string> = { fi: 'fi-FI', en: 'en-US', sv: 'sv-SE' }

export const toLanguageTag = (language: string | undefined): string => LANGUAGE_TAGS[(language ?? '').slice(0, 2).toLowerCase()] ?? 'fi-FI'

export const conversationTitle = (t: TFunction, date = new Date()) => `${t('chat:conversation')} ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`

export const assistantHeading = (msg: ClientChatMessage, t: TFunction): string => {
  if (msg.role !== 'assistant' || !msg.generationInfo) return t('email:assistant')
  const { model, promptInfo } = msg.generationInfo
  return `${t('email:assistant')} – ${promptInfo.type === 'saved' ? `${promptInfo.name}, ${model}` : model}`
}

/**
 * Headings inside a message keep the level they have in the chat (`###` is level 3 in both), so the files match
 * what users see in the app. The markdown is rendered with its own heading levels in the chat as well.
 */
export const messageHeadingLevel = (depth: number) => Math.min(Math.max(depth, 1), 6)

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)

export const parseMarkdown = (text: string): Root => parser.runSync(parser.parse(text)) as Root

export const buildExportDocument = (messages: ClientChatMessage[], t: TFunction, language: string | undefined): ExportDocument => ({
  title: conversationTitle(t),
  lang: toLanguageTag(language),
  sections: messages.map((msg) => {
    const notes: string[] = []
    let heading: string

    if (msg.role === 'user') {
      heading = t('email:user')
      if (msg.attachments) notes.push(`[Attachment: ${msg.attachments}]`)
    } else {
      heading = assistantHeading(msg, t)
      if (msg.error) notes.push(`[Error: ${msg.error}]`)
      messageToolResults(msg).forEach((toolCall) => {
        if (toolCall.result && toolCall.input) {
          const filenames = (toolCall.result.files ?? []).map((f) => f.fileName).join(', ')
          notes.push(`[Sources: ${filenames} - Query: "${toolCall.input.query}"]`)
        }
      })
    }

    return { heading, role: msg.role, content: parseMarkdown(messageToText(msg)), notes }
  }),
})

/** A piece of inline text with its formatting, flattened out of the mdast phrasing tree */
export type InlineRun = {
  text: string
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  link?: string
}

export const flattenInline = (nodes: PhrasingContent[], inherited: Omit<InlineRun, 'text'> = {}): InlineRun[] =>
  nodes.flatMap((node): InlineRun[] => {
    switch (node.type) {
      case 'text':
        return [{ ...inherited, text: node.value }]
      case 'strong':
        return flattenInline(node.children, { ...inherited, bold: true })
      case 'emphasis':
        return flattenInline(node.children, { ...inherited, italic: true })
      case 'delete':
        return flattenInline(node.children, { ...inherited, strike: true })
      case 'inlineCode':
        return [{ ...inherited, code: true, text: node.value }]
      case 'inlineMath':
        return [{ ...inherited, code: true, text: node.value }]
      case 'break':
        return [{ ...inherited, text: '\n' }]
      case 'link': {
        const runs = flattenInline(node.children, { ...inherited, link: node.url })
        return runs.length > 0 ? runs : [{ ...inherited, link: node.url, text: node.url }]
      }
      case 'image':
        return node.alt ? [{ ...inherited, text: node.alt }] : []
      case 'html':
        return [{ ...inherited, text: node.value }]
      case 'footnoteReference':
        return [{ ...inherited, text: `[${node.label ?? node.identifier}]` }]
      default:
        return 'children' in node ? flattenInline(node.children as PhrasingContent[], inherited) : []
    }
  })

export const inlineText = (nodes: PhrasingContent[]) =>
  flattenInline(nodes)
    .map((run) => run.text)
    .join('')
