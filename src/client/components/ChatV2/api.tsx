import { type ClientChatMessage, messageToExportText, messageToolResults } from './messages'
import type { ChatToolOutput } from '../../../shared/tools'
import { useGetQuery } from '../../hooks/apiHooks'
import { TFunction } from 'i18next'
import { sendEmail } from '../../util/email'
import { saveFileWithDialog } from '../../util/saveFile'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildExportDocument } from './exportDocument'

export const useToolResults = (toolCallId: string) => {
  return useGetQuery<ChatToolOutput | { expired: true }>({
    queryKey: ['toolResults', toolCallId],
    url: `/ai/toolResults/${toolCallId}`,
    enabled: !!toolCallId,
    retry: false,
  })
}

export const sendConversationEmail = async (messages: ClientChatMessage[], t: TFunction) => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  const subject = `${t('chat:conversation')} ${formattedDate}`
  const text = formatEmail(messages, t)

  const response = await sendEmail(text, subject)
  return response
}

export type DownloadFormat = 'md' | 'docx' | 'pdf' | 'txt'

const DOWNLOAD_TYPES: Record<DownloadFormat, { mime: string; accept: Record<string, string[]> }> = {
  md: { mime: 'text/markdown;charset=utf-8', accept: { 'text/markdown': ['.md'] } },
  txt: { mime: 'text/plain;charset=utf-8', accept: { 'text/plain': ['.txt'] } },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
  },
  pdf: { mime: 'application/pdf', accept: { 'application/pdf': ['.pdf'] } },
}

const downloadFilename = (format: DownloadFormat, date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `currechat-discussion-${stamp}.${format}`
}

export const downloadDiscussionAsFile = async (messages: ClientChatMessage[], t: TFunction, format: DownloadFormat = 'md', language?: string) => {
  let blob: Blob
  if (format === 'docx') {
    const { exportDocxBlob } = await import('./exportDocx')
    blob = await exportDocxBlob(buildExportDocument(messages, t, language))
  } else if (format === 'pdf') {
    const { exportPdfBlob } = await import('./exportPdf')
    blob = await exportPdfBlob(buildExportDocument(messages, t, language))
  } else {
    const text = format === 'txt' ? formatMessagesAsPlainText(messages, t) : formatMessagesAsText(messages, t)
    blob = new Blob([text], { type: DOWNLOAD_TYPES[format].mime })
  }
  await saveFileWithDialog(blob, downloadFilename(format), DOWNLOAD_TYPES[format].accept)
}

export const formatMessagesAsPlainText = (messages: ClientChatMessage[], t: TFunction): string => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`

  const textLines: string[] = []
  textLines.push(`${t('chat:conversation')} ${formattedDate}`)
  textLines.push('')
  textLines.push('========================================')
  textLines.push('')

  messages.forEach((msg, i) => {
    const content = messageToExportText(msg, t, messages[i + 1])

    // Strip all markdown formatting for plain text
    const cleanContent = content
      .replace(/^#{1,6}\s+(.+)$/gm, '$1') // Strip headings
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // ***bold+italic***
      .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
      .replace(/\*(.+?)\*/g, '$1') // *italic*
      .replace(/`(.+?)`/g, '$1') // `code`
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [text](url)

    if (msg.role === 'user') {
      textLines.push('[USER]')
      textLines.push(cleanContent)

      if (msg.attachments) {
        textLines.push(`[Attachment: ${msg.attachments}]`)
      }
    } else {
      let modelInfo = t('email:assistant')
      if (msg.generationInfo) {
        modelInfo = msg.generationInfo.model
        if (msg.generationInfo.promptInfo.type === 'saved') {
          modelInfo = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
        }
      }

      textLines.push(`[ASSISTANT - ${modelInfo}]`)
      textLines.push(cleanContent)

      if (msg.error) {
        textLines.push(`[Error: ${msg.error}]`)
      }

      const toolResults = messageToolResults(msg)
      if (toolResults.length > 0) {
        toolResults.forEach((toolCall) => {
          if (toolCall.result && toolCall.input) {
            const filenames = (toolCall.result.files ?? []).map((f) => f.fileName).join(', ')
            textLines.push(`[Sources: ${filenames} - Query: "${toolCall.input.query}"]`)
          }
        })
      }
    }

    textLines.push('')
    textLines.push('----------------------------------------')
    textLines.push('')
  })

  return textLines.join('\n')
}

export const formatMessagesAsText = (messages: ClientChatMessage[], t: TFunction): string => {
  const textContent = messages
    .map((msg, i) => {
      const content = messageToExportText(msg, t, messages[i + 1])
      let header = ''

      if (msg.role === 'user') {
        header = '[USER]'
        const parts = [header, content]

        if (msg.attachments) {
          parts.push(`[Attachment: ${msg.attachments}]`)
        }

        return parts.join('\n')
      } else {
        // Assistant message
        let modelInfo = t('email:assistant')
        if (msg.generationInfo) {
          modelInfo = msg.generationInfo.model
          if (msg.generationInfo.promptInfo.type === 'saved') {
            modelInfo = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
          }
        }
        header = `[ASSISTANT - ${modelInfo}]`

        const parts = [header, content]

        if (msg.error) {
          parts.push(`[Error: ${msg.error}]`)
        }

        const toolResults = messageToolResults(msg)
        if (toolResults.length > 0) {
          const sources = toolResults
            .map((toolCall) => {
              if (toolCall.result && toolCall.input) {
                const filenames = (toolCall.result.files ?? []).map((f) => f.fileName).join(', ')
                return `[Sources: ${filenames} - Query: "${toolCall.input.query}"]`
              }
              return null
            })
            .filter(Boolean)
            .join('\n')

          if (sources) {
            parts.push(sources)
          }
        }

        return parts.join('\n')
      }
    })
    .join('\n\n---\n\n')

  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  const title = `# ${t('chat:conversation')} ${formattedDate}\n\n`

  return title + textContent
}

const escapeHtml = (str: string): string =>
  str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')

const formatEmailContent = (content: string): string => {
  // emails don't exactly support katex etc – hence this unicode mayhem T_T
  const emailFriendlyMath = content
    .replace(/\$\$([^$]+)\$\$/g, '[$1]')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\int/g, '∫')
    .replace(/\\infty/g, '∞')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\abs\{([^}]+)\}/g, '|$1|')
    .replace(/\\norm\{([^}]+)\}/g, '||$1||')
    .replace(/\\R/g, 'ℝ')
    .replace(/\\C/g, 'ℂ')
    .replace(/\\N/g, 'ℕ')
    .replace(/\\Z/g, 'ℤ')
    .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
    .replace(/\\deriv\{([^}]+)\}\{([^}]+)\}/g, 'd$1/d$2')
    .replace(/\\pdv\{([^}]+)\}\{([^}]+)\}/g, '∂$1/∂$2')
    .replace(/\\set\{([^}]+)\}/g, '{$1}')
    .replace(/\\lr\{([^}]+)\}/g, '($1)')
    .replace(/\\T/g, 'ᵀ')
    .replace(/\\defeq/g, '≔')
    .replace(/\\epsilon_0/g, 'ε₀')
    .replace(/\\mu_0/g, 'μ₀')
    .replace(/\\curl/g, '∇×')
    .replace(/\\grad/g, '∇')
    .replace(/\\laplacian/g, '∇²')
    .replace(/\\dd\{([^}]+)\}/g, 'd$1')
    .replace(/\\pd\{([^}]+)\}/g, '∂$1')
    .replace(/\\vb\{([^}]+)\}/g, '$1⃗')
    .replace(/\\vu\{([^}]+)\}/g, '$1̂')
    .replace(/\\aprx/g, '≈')
    .replace(/\\bra\{([^}]+)\}/g, '⟨$1|')
    .replace(/\\ket\{([^}]+)\}/g, '|$1⟩')
    .replace(/\\braket\{([^}]+)\}\{([^}]+)\}/g, '⟨$1|$2⟩')
    .replace(/\\oprod\{([^}]+)\}\{([^}]+)\}/g, '|$1⟩⟨$2|')
    .replace(/\\slashed\{([^}]+)\}/g, '$1/')

  try {
    const markdownElement = (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className } = props
            const match = /language-(\w+)/.exec(className || '')

            if (match) {
              return (
                <div style={{ margin: '1rem 0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      padding: '8px 12px',
                      backgroundColor: '#f8f9fa',
                      borderBottom: '1px solid #e9ecef',
                    }}
                  >
                    {match[1]}
                  </div>
                  <pre
                    style={{
                      backgroundColor: '#2d3748',
                      color: '#e2e8f0',
                      padding: '16px',
                      margin: '0',
                      fontSize: '16px',
                      fontFamily: 'Monaco, Consolas, monospace',
                    }}
                  >
                    <code>{String(children)}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code
                style={{
                  backgroundColor: '#f1f3f4',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'Monaco, Consolas, monospace',
                  fontSize: '16px',
                }}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {emailFriendlyMath}
      </ReactMarkdown>
    )

    return renderToStaticMarkup(markdownElement)
  } catch {
    return escapeHtml(content)
  }
}

export const formatEmail = (messages: ClientChatMessage[], t: TFunction): string => {
  const emailContent = messages
    .map((msg, i) => {
      const text = messageToExportText(msg, t, messages[i + 1])
      const formattedContent = msg.role === 'assistant' ? formatEmailContent(text) : escapeHtml(text)

      let title = ''
      if (msg.role === 'assistant') {
        title = t('email:assistant')
        if (msg.generationInfo) {
          title = msg.generationInfo.model
          if (msg.generationInfo.promptInfo.type === 'saved') {
            title = `${msg.generationInfo.promptInfo.name} (${msg.generationInfo.model})`
          }
        }
      }

      return `
      <div style="padding: 1rem; ${
        msg.role === 'user'
          ? 'background: #efefef; margin-left: 100px; border-radius: 0.6rem; box-shadow: 0px 2px 2px rgba(0,0,0,0.2); white-space: pre-wrap; word-break: break-word; '
          : 'margin-right: 2rem;'
      }">
        ${title ? `<h3 style="font-style: italic; margin: 0; color: #107eab">${title}:</h3>` : ''}
        ${formattedContent}
      </div>
    `
    })
    .join('')

  return `
    <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    color: rgba(0, 0, 0, 0.8);
                    line-height: 1.6;
                    margin: 0 auto;
                }
            </style>
        </head>
        <body>
            ${emailContent}
        </body>
    </html>
`
}
