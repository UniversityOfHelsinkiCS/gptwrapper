import { readMessageContent, type ChatMessage, type PostStreamSchemaV3Type } from '../../../shared/chat'
import { postAbortableStream } from '../../util/apiClient'
import type { ChatToolOutput } from '../../../shared/tools'
import { useGetQuery } from '../../hooks/apiHooks'
import { TFunction } from 'i18next'
import { sendEmail } from '../../util/email'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { renderToStaticMarkup } from 'react-dom/server'

export const useToolResults = (toolCallId: string) => {
  return useGetQuery<ChatToolOutput | { expired: true }>({
    queryKey: ['toolResults', toolCallId],
    url: `/ai/toolResults/${toolCallId}`,
    enabled: !!toolCallId,
    retry: false,
  })
}

export const postCompletionStreamV3 = async (formData: FormData, input: PostStreamSchemaV3Type, abortController?: AbortController) => {
  formData.set('data', JSON.stringify(input))

  return postAbortableStream('/ai/v3/stream', formData, abortController)
}

export const sendConversationEmail = async (email: string, messages: ChatMessage[], t: TFunction) => {
  const date = new Date()
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
  const subject = `${t('chat:conversation')} ${formattedDate}`
  const text = formatEmail(messages, t)

  const response = await sendEmail(email, text, subject)
  return response
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
  } catch (error) {
    return escapeHtml(content)
  }
}

const formatEmail = (messages: ChatMessage[], t): string => {
  const emailContent = messages
    .map((msg) => {
      const formattedContent = msg.role === 'assistant' ? formatEmailContent(readMessageContent(msg)) : escapeHtml(readMessageContent(msg))

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
